-- Ofertas a medida para solicitudes "Hablemos" (Enterprise)
ALTER TABLE public.contact_requests ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.contact_requests ADD COLUMN IF NOT EXISTS offer_price TEXT;
ALTER TABLE public.contact_requests ADD COLUMN IF NOT EXISTS offer_commission TEXT;
ALTER TABLE public.contact_requests ADD COLUMN IF NOT EXISTS offer_seats TEXT;
ALTER TABLE public.contact_requests ADD COLUMN IF NOT EXISTS offer_message TEXT;
ALTER TABLE public.contact_requests ADD COLUMN IF NOT EXISTS offer_status TEXT DEFAULT 'none';
-- offer_status: none | offered | accepted | declined

-- La empresa que la envió puede VER su propia solicitud (para ver la oferta)
DROP POLICY IF EXISTS "contact_select_own" ON public.contact_requests;
CREATE POLICY "contact_select_own" ON public.contact_requests FOR SELECT
  USING (auth.uid() = user_id OR lower(email) = lower(auth.jwt() ->> 'email'));

-- La empresa puede aceptar/rechazar la oferta (solo su fila)
DROP POLICY IF EXISTS "contact_update_own" ON public.contact_requests;
CREATE POLICY "contact_update_own" ON public.contact_requests FOR UPDATE
  USING (auth.uid() = user_id OR lower(email) = lower(auth.jwt() ->> 'email'));

NOTIFY pgrst, 'reload schema';
SELECT 'Ofertas Hablemos listas' AS status;
