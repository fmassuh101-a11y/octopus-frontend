-- Bajar el mínimo de retiro a $5 en la función atómica (para el test real de bajo riesgo).
create or replace function public.oct_request_withdrawal(p_amount numeric, p_fee_percent numeric)
returns json language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_balance numeric; v_fee numeric; v_net numeric; v_id uuid;
begin
  if v_user is null then return json_build_object('ok', false, 'error', 'no_auth'); end if;
  if p_amount is null or p_amount < 5 then return json_build_object('ok', false, 'error', 'min_5'); end if;
  if p_fee_percent is null or p_fee_percent < 0 or p_fee_percent > 0.10 then return json_build_object('ok', false, 'error', 'bad_fee'); end if;
  select balance into v_balance from public.wallets where user_id = v_user for update;
  if v_balance is null then return json_build_object('ok', false, 'error', 'no_wallet'); end if;
  if v_balance < p_amount then return json_build_object('ok', false, 'error', 'insufficient', 'balance', v_balance); end if;
  v_fee := round(p_amount * p_fee_percent, 2); v_net := round(p_amount - v_fee, 2);
  update public.wallets set balance = balance - p_amount where user_id = v_user;
  insert into public.withdrawal_requests (user_id, amount, fee_amount, net_amount, status)
  values (v_user, p_amount, v_fee, v_net, 'pending') returning id into v_id;
  return json_build_object('ok', true, 'id', v_id, 'fee', v_fee, 'net', v_net);
end; $$;
