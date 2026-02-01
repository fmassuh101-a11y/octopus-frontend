-- =====================================================
-- SISTEMA DE PAGOS Y WALLETS - OCTOPUS MVP
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Tabla de Wallets (para empresas y creadores)
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('creator', 'company')),
  balance DECIMAL(12, 2) DEFAULT 0.00,
  pending_balance DECIMAL(12, 2) DEFAULT 0.00,
  total_earned DECIMAL(12, 2) DEFAULT 0.00,
  total_withdrawn DECIMAL(12, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Tabla de Transacciones
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'deposit',           -- Empresa agrega fondos
    'withdrawal',        -- Retiro a cuenta externa
    'payment_sent',      -- Empresa paga a creador
    'payment_received',  -- Creador recibe pago
    'fee',               -- Fee de plataforma
    'refund',            -- Reembolso
    'bonus'              -- Bonus
  )),
  amount DECIMAL(12, 2) NOT NULL,
  fee DECIMAL(12, 2) DEFAULT 0.00,
  net_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  description TEXT,
  reference_id UUID,  -- ID del gig, aplicación, etc.
  reference_type VARCHAR(30),  -- 'gig', 'application', 'withdrawal_request'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Solicitudes de Retiro
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  fee DECIMAL(12, 2) DEFAULT 0.00,
  net_amount DECIMAL(12, 2) NOT NULL,
  method VARCHAR(30) NOT NULL CHECK (method IN ('bank_transfer', 'paypal', 'crypto_usdt', 'crypto_usdc')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected')),
  -- Detalles del método de pago
  payment_details JSONB NOT NULL,
  -- Info del admin
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Admins
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(30) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  permissions JSONB DEFAULT '["all"]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- 5. Insertar admin principal
-- NOTA: Primero el usuario debe registrarse con este email
-- Luego ejecutar esto manualmente o mediante un trigger
INSERT INTO admins (user_id, email, role, permissions)
SELECT id, email, 'super_admin', '["all"]'
FROM auth.users
WHERE email = 'Fmassuh133@gmail.com'
ON CONFLICT (email) DO NOTHING;

-- 6. Función para crear wallet automáticamente
CREATE OR REPLACE FUNCTION create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Obtener el tipo de usuario del profile
  DECLARE
    v_user_type VARCHAR(20);
  BEGIN
    SELECT user_type INTO v_user_type
    FROM profiles
    WHERE user_id = NEW.user_id;

    IF v_user_type IS NOT NULL THEN
      INSERT INTO wallets (user_id, user_type)
      VALUES (NEW.user_id, v_user_type)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger para crear wallet cuando se crea perfil
DROP TRIGGER IF EXISTS on_profile_created_create_wallet ON profiles;
CREATE TRIGGER on_profile_created_create_wallet
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_user();

-- 8. Función para procesar pago de empresa a creador
CREATE OR REPLACE FUNCTION process_payment(
  p_company_id UUID,
  p_creator_id UUID,
  p_amount DECIMAL,
  p_reference_id UUID,
  p_reference_type VARCHAR,
  p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_company_wallet wallets%ROWTYPE;
  v_creator_wallet wallets%ROWTYPE;
  v_platform_fee DECIMAL;
  v_creator_amount DECIMAL;
BEGIN
  -- Calcular fee (10% por defecto)
  v_platform_fee := p_amount * 0.10;
  v_creator_amount := p_amount - v_platform_fee;

  -- Obtener wallet de empresa
  SELECT * INTO v_company_wallet
  FROM wallets
  WHERE user_id = p_company_id;

  -- Verificar balance suficiente
  IF v_company_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Obtener wallet de creador
  SELECT * INTO v_creator_wallet
  FROM wallets
  WHERE user_id = p_creator_id;

  -- Crear wallet si no existe
  IF v_creator_wallet.id IS NULL THEN
    INSERT INTO wallets (user_id, user_type)
    VALUES (p_creator_id, 'creator')
    RETURNING * INTO v_creator_wallet;
  END IF;

  -- Descontar de empresa
  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_company_wallet.id;

  -- Agregar a creador
  UPDATE wallets
  SET balance = balance + v_creator_amount,
      total_earned = total_earned + v_creator_amount,
      updated_at = NOW()
  WHERE id = v_creator_wallet.id;

  -- Registrar transacción de empresa
  INSERT INTO transactions (wallet_id, type, amount, fee, net_amount, description, reference_id, reference_type)
  VALUES (v_company_wallet.id, 'payment_sent', p_amount, 0, p_amount, p_description, p_reference_id, p_reference_type);

  -- Registrar transacción de creador
  INSERT INTO transactions (wallet_id, type, amount, fee, net_amount, description, reference_id, reference_type)
  VALUES (v_creator_wallet.id, 'payment_received', p_amount, v_platform_fee, v_creator_amount, p_description, p_reference_id, p_reference_type);

  RETURN jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'fee', v_platform_fee,
    'creator_receives', v_creator_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RLS Policies

-- Wallets: usuarios solo ven su wallet
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins pueden ver todos los wallets
CREATE POLICY "Admins can view all wallets"
  ON wallets FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- Transactions: usuarios ven sus transacciones
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (
    wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
  );

-- Admins pueden ver todas las transacciones
CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- Withdrawal requests: usuarios ven sus requests
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawal requests"
  ON withdrawal_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create withdrawal requests"
  ON withdrawal_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins pueden ver y modificar todos los requests
CREATE POLICY "Admins can manage all withdrawal requests"
  ON withdrawal_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- Admins table: solo admins pueden ver
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin list"
  ON admins FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- =====================================================
-- CREAR WALLETS PARA USUARIOS EXISTENTES
-- =====================================================

INSERT INTO wallets (user_id, user_type)
SELECT p.user_id, p.user_type
FROM profiles p
WHERE p.user_type IN ('creator', 'company')
  AND NOT EXISTS (SELECT 1 FROM wallets w WHERE w.user_id = p.user_id)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- Para verificar:
-- SELECT * FROM wallets;
-- SELECT * FROM admins;
-- SELECT * FROM withdrawal_requests;
