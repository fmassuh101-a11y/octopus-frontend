-- Guarda el método de pago de Whop (payt_xxx) de cada empresa.
--
-- POR QUÉ HACE FALTA
-- Depositar por checkout cuesta 2,7% + $0,30 de procesamiento. La API de Topup
-- de Whop no cobra nada, pero exige un payment_method_id: una tarjeta ya
-- guardada. Esa tarjeta se captura una sola vez con un checkout en modo
-- "setup" (sin cobrar), y Whop nos manda el id por webhook
-- (setup_intent.succeeded). Acá es donde queda guardado.
--
-- Sin esta columna, el webhook no puede persistir la tarjeta y todos los
-- depósitos seguirían pagando la comisión del checkout.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whop_payment_method_id TEXT;

COMMENT ON COLUMN public.profiles.whop_payment_method_id IS
  'Método de pago guardado en Whop (payt_xxx) para depositar por Topup sin comisión. Lo escribe el webhook setup_intent.succeeded.';
