-- PAGOS Whop — setup del ledger de retiros (jul 8, 2026)
-- Pegar en el SQL Editor de Supabase. Depende de: tablas wallets y withdrawal_requests ya existentes.
-- Crea: columnas de fee en withdrawal_requests, flag is_pro en profiles, y la función ATÓMICA
-- de retiro (descuenta saldo + crea solicitud en UNA transacción — sin dobles retiros).

-- 1) columnas para el detalle del retiro
alter table public.withdrawal_requests add column if not exists fee_amount numeric default 0;
alter table public.withdrawal_requests add column if not exists net_amount numeric default 0;
alter table public.withdrawal_requests add column if not exists whop_transfer_id text;

-- 2) flag Pro del creador (0% de fee si es Pro)
alter table public.profiles add column if not exists is_pro boolean default false;

-- 3) función atómica de retiro.
--    Corre como el usuario autenticado (auth.uid()) — nadie puede retirar por otro.
--    Bloquea la fila del wallet (for update) => dos requests simultáneos no pueden
--    descontar el mismo saldo dos veces.
create or replace function public.oct_request_withdrawal(p_amount numeric, p_fee_percent numeric)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_balance numeric;
  v_fee numeric;
  v_net numeric;
  v_id uuid;
begin
  if v_user is null then
    return json_build_object('ok', false, 'error', 'no_auth');
  end if;
  if p_amount is null or p_amount < 20 then
    return json_build_object('ok', false, 'error', 'min_20');
  end if;
  if p_fee_percent is null or p_fee_percent < 0 or p_fee_percent > 0.10 then
    return json_build_object('ok', false, 'error', 'bad_fee');
  end if;

  -- lock de la fila del wallet: atómico contra retiros simultáneos
  select balance into v_balance from public.wallets where user_id = v_user for update;
  if v_balance is null then
    return json_build_object('ok', false, 'error', 'no_wallet');
  end if;
  if v_balance < p_amount then
    return json_build_object('ok', false, 'error', 'insufficient', 'balance', v_balance);
  end if;

  v_fee := round(p_amount * p_fee_percent, 2);
  v_net := round(p_amount - v_fee, 2);

  update public.wallets set balance = balance - p_amount where user_id = v_user;

  insert into public.withdrawal_requests (user_id, amount, fee_amount, net_amount, status)
  values (v_user, p_amount, v_fee, v_net, 'pending')
  returning id into v_id;

  return json_build_object('ok', true, 'id', v_id, 'fee', v_fee, 'net', v_net);
end;
$$;

-- solo usuarios logueados pueden llamarla
revoke all on function public.oct_request_withdrawal(numeric, numeric) from public;
grant execute on function public.oct_request_withdrawal(numeric, numeric) to authenticated;

-- ============================================================
-- 4) FONDEO de la empresa (pay-in con Whop) — registro idempotente
-- ============================================================
create table if not exists public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  whop_payment_id text unique not null,   -- idempotencia: un pago de Whop acredita UNA sola vez
  base_amount numeric not null,           -- lo que entra al wallet de la empresa
  fee_amount numeric not null default 0,  -- fee de plataforma de Octopus (se queda en Whop balance)
  total_paid numeric not null,
  created_at timestamptz default now()
);
alter table public.wallet_topups enable row level security;
drop policy if exists wt_read_own on public.wallet_topups;
create policy wt_read_own on public.wallet_topups for select using (auth.uid() = user_id);
-- (sin policy de insert: solo el service role del servidor inserta)

-- necesario para el upsert del wallet (un wallet por usuario)
create unique index if not exists wallets_user_id_key on public.wallets(user_id);

-- 5) RPC: aplicar un top-up de forma atómica e idempotente.
--    Solo el service role (el servidor) puede ejecutarla.
create or replace function public.oct_apply_topup(
  p_user uuid, p_whop_payment_id text, p_base numeric, p_fee numeric, p_total numeric
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted boolean := false;
begin
  if p_base is null or p_base <= 0 or p_base > 100000 then
    return json_build_object('ok', false, 'error', 'bad_amount');
  end if;

  -- idempotencia: si el pago ya se aplicó, no acreditar de nuevo
  insert into public.wallet_topups (user_id, whop_payment_id, base_amount, fee_amount, total_paid)
  values (p_user, p_whop_payment_id, p_base, coalesce(p_fee, 0), coalesce(p_total, p_base))
  on conflict (whop_payment_id) do nothing;
  get diagnostics v_inserted = row_count;
  if not v_inserted then
    return json_build_object('ok', true, 'already', true);
  end if;

  -- acreditar el wallet (crearlo si no existe) — un solo statement, atómico
  insert into public.wallets (user_id, balance)
  values (p_user, p_base)
  on conflict (user_id) do update set balance = wallets.balance + excluded.balance;

  return json_build_object('ok', true, 'credited', p_base);
end;
$$;
revoke all on function public.oct_apply_topup(uuid, text, numeric, numeric, numeric) from public;
revoke all on function public.oct_apply_topup(uuid, text, numeric, numeric, numeric) from authenticated;
grant execute on function public.oct_apply_topup(uuid, text, numeric, numeric, numeric) to service_role;

-- FIX (jul 8, visto en producción): wallets.user_type es NOT NULL sin default,
-- lo que rompía el upsert de acreditación. Default para que el ON CONFLICT funcione.
alter table public.wallets alter column user_type set default 'creator';
