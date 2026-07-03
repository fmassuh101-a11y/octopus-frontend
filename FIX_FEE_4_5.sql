-- Baja el fee de plataforma de 10% a 4.5% en la función de pago
CREATE OR REPLACE FUNCTION process_payment(
  p_company_id UUID, p_creator_id UUID, p_amount DECIMAL,
  p_reference_id UUID, p_reference_type VARCHAR, p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_company_wallet wallets%ROWTYPE;
  v_creator_wallet wallets%ROWTYPE;
  v_platform_fee DECIMAL;
  v_creator_amount DECIMAL;
BEGIN
  v_platform_fee := p_amount * 0.045;   -- 4.5%
  v_creator_amount := p_amount - v_platform_fee;

  SELECT * INTO v_company_wallet FROM wallets WHERE user_id = p_company_id;
  IF v_company_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  SELECT * INTO v_creator_wallet FROM wallets WHERE user_id = p_creator_id;
  IF v_creator_wallet.id IS NULL THEN
    INSERT INTO wallets (user_id, user_type) VALUES (p_creator_id, 'creator') RETURNING * INTO v_creator_wallet;
  END IF;

  UPDATE wallets SET balance = balance - p_amount, updated_at = NOW() WHERE id = v_company_wallet.id;
  UPDATE wallets SET balance = balance + v_creator_amount, total_earned = total_earned + v_creator_amount, updated_at = NOW() WHERE id = v_creator_wallet.id;

  INSERT INTO transactions (wallet_id, type, amount, fee, net_amount, description, reference_id, reference_type)
  VALUES (v_company_wallet.id, 'payment_sent', p_amount, 0, p_amount, p_description, p_reference_id, p_reference_type);
  INSERT INTO transactions (wallet_id, type, amount, fee, net_amount, description, reference_id, reference_type)
  VALUES (v_creator_wallet.id, 'payment_received', p_amount, v_platform_fee, v_creator_amount, p_description, p_reference_id, p_reference_type);

  RETURN jsonb_build_object('success', true, 'amount', p_amount, 'fee', v_platform_fee, 'creator_receives', v_creator_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Fee actualizado a 4.5%' AS status;
