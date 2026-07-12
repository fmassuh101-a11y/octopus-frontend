-- FIX (jul 12): el pago al creador sumaba solo al balance, no a total_earned,
-- por eso "Tus ganancias" salía $0. Ahora suma a los dos. Pegar en Supabase y Run.

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

  select balance into v_balance from public.wallets where user_id = p_company for update;
  if v_balance is null or v_balance < p_amount then
    return json_build_object('success', false, 'error', 'insufficient');
  end if;

  update public.wallets set balance = balance - p_amount where user_id = p_company;

  -- acreditar al creador: sube el saldo Y las ganancias totales (lifetime)
  insert into public.wallets (user_id, user_type, balance, total_earned)
  values (p_creator, 'creator', p_amount, p_amount)
  on conflict (user_id) do update
    set balance = wallets.balance + excluded.balance,
        total_earned = coalesce(wallets.total_earned, 0) + excluded.balance;

  select balance into v_new from public.wallets where user_id = p_creator;

  insert into public.wallet_movements (user_id, amount, kind, description)
  values (p_creator, p_amount, 'pago_recibido', coalesce(p_description, 'Pago recibido')),
         (p_company, -p_amount, 'pago_enviado', coalesce(p_description, 'Pago enviado'));

  return json_build_object('success', true, 'creator_balance', v_new);
end;
$$;

-- backfill: para los pagos que ya se hicieron, poner total_earned al menos igual al balance
update public.wallets set total_earned = greatest(coalesce(total_earned,0), coalesce(balance,0))
where user_type = 'creator';
