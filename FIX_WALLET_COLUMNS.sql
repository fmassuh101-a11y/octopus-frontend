-- Columnas que la wallet/payouts (Whop) esperan en profiles y no estaban
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whop_company_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whop_user_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT;
NOTIFY pgrst, 'reload schema';
SELECT 'Columnas de wallet agregadas' AS status;
