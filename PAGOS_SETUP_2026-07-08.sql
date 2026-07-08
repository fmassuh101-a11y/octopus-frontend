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
