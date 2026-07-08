-- FIX pagos (jul 8): el creador recibe el monto COMPLETO (comisión solo al retirar)
-- + registro de movimientos para "te pagaron". Pegar en Supabase SQL Editor.

-- 1) movimientos del wallet (para notificaciones e historial)
create table if not exists public.wallet_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount numeric not null,          -- positivo = entra, negativo = sale
  kind text not null,               -- pago_recibido | pago_enviado
  description text default '',
  seen boolean default false,       -- para la notificación "te pagaron"
  created_at timestamptz default now()
);
alter table public.wallet_movements enable row level security;
drop policy if exists wm_read_own on public.wallet_movements;
create policy wm_read_own on public.wallet_movements for select using (auth.uid() = user_id);
drop policy if exists wm_update_own on public.wallet_movements;
create policy wm_update_own on public.wallet_movements for update using (auth.uid() = user_id);

-- 2) pago directo ATÓMICO empresa → creador, SIN comisión (la comisión es al retirar)
create or replace function public.oct_pay_creator(
  p_company uuid, p_creator uuid, p_amount numeric, p_description text
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_new numeric;
begin
  if p_amount is null or p_amount < 0.5 or p_amount > 50000 then
    return json_build_object('success', false, 'error', 'bad_amount');
  end if;

  -- lock del wallet de la empresa (sin dobles gastos)
  select balance into v_balance from public.wallets where user_id = p_company for update;
  if v_balance is null or v_balance < p_amount then
    return json_build_object('success', false, 'error', 'insufficient');
  end if;

  update public.wallets set balance = balance - p_amount where user_id = p_company;

  -- acreditar el monto COMPLETO al creador (crea el wallet si no existe)
  insert into public.wallets (user_id, user_type, balance)
  values (p_creator, 'creator', p_amount)
  on conflict (user_id) do update set balance = wallets.balance + excluded.balance;

  select balance into v_new from public.wallets where user_id = p_creator;

  insert into public.wallet_movements (user_id, amount, kind, description)
  values (p_creator, p_amount, 'pago_recibido', coalesce(p_description, 'Pago recibido')),
         (p_company, -p_amount, 'pago_enviado', coalesce(p_description, 'Pago enviado'));

  return json_build_object('success', true, 'creator_balance', v_new);
end;
$$;
revoke all on function public.oct_pay_creator(uuid, uuid, numeric, text) from public;
revoke all on function public.oct_pay_creator(uuid, uuid, numeric, text) from authenticated;
grant execute on function public.oct_pay_creator(uuid, uuid, numeric, text) to service_role;
