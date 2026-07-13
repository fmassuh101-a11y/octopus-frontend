-- ============================================================
-- AUTO-PAYOUT (jul 2026) — pegar en el editor SQL de Supabase
-- La plata del creador NO se queda en Octopus: cuando le pagan, el server
-- la transfiere de inmediato a SU cuenta de Whop (cero custodia nuestra).
-- Esta función descuenta el ledger de forma atómica DESPUÉS de que la
-- transferencia a Whop salió bien. Solo la llama el server (service key).
-- ============================================================

create or replace function public.oct_auto_payout(p_user uuid, p_amount numeric)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_balance numeric;
begin
  if p_amount is null or p_amount <= 0 then
    return json_build_object('ok', false, 'error', 'bad_amount');
  end if;

  select balance into v_balance from public.wallets where user_id = p_user for update;
  if v_balance is null then return json_build_object('ok', false, 'error', 'no_wallet'); end if;
  if v_balance < p_amount then return json_build_object('ok', false, 'error', 'insufficient'); end if;

  update public.wallets set balance = balance - p_amount where user_id = p_user;

  insert into public.wallet_movements (user_id, amount, kind, description, seen)
  values (p_user, p_amount, 'retiro', 'Enviado a tu cuenta de cobros', true);

  return json_build_object('ok', true);
end;
$$;

-- solo el server (service role) puede llamarla
revoke all on function public.oct_auto_payout(uuid, numeric) from public, anon, authenticated;
