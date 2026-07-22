-- Videos que el creador comparte explícitamente con una empresa, por
-- contrato. Sin esto, "verificar por cuenta" da acceso a TODA la cuenta —
-- pedido explícito de Felipe: la empresa solo debe poder ver los videos
-- puntuales que el creador le autoriza, nunca un link cualquiera que la
-- empresa arme por su cuenta copiándolo del perfil público del creador.
--
-- Aislamiento real (no solo de código, de la base de datos misma): cada
-- fila solo la pueden ver las DOS partes del contrato al que pertenece —
-- si la Empresa A no tiene un contrato con el Creador 5, esta tabla le
-- devuelve CERO filas de él, sin importar qué pida.

CREATE TABLE IF NOT EXISTS public.contract_video_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  platform TEXT NOT NULL DEFAULT 'tiktok',
  video_url TEXT NOT NULL,
  video_id TEXT,               -- sacado de la URL (ej. el número al final del link de TikTok)
  account_username TEXT,       -- de qué cuenta conectada vino
  stats JSONB,                 -- último snapshot real traído de la API (views/likes/comments/shares)
  stats_fetched_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_video_shares_contract_id_idx ON public.contract_video_shares(contract_id);
CREATE INDEX IF NOT EXISTS contract_video_shares_creator_id_idx ON public.contract_video_shares(creator_id);

ALTER TABLE public.contract_video_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties can view their shared videos" ON public.contract_video_shares;
CREATE POLICY "Parties can view their shared videos" ON public.contract_video_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contracts
      WHERE contracts.id = contract_video_shares.contract_id
      AND (contracts.creator_id = auth.uid() OR contracts.company_id = auth.uid())
    )
  );

-- Solo el CREADOR de ese contrato puede agregar videos — la empresa nunca
-- puede insertar un link por su cuenta, solo ver los que ya le compartieron.
DROP POLICY IF EXISTS "Creator can share videos on their own contracts" ON public.contract_video_shares;
CREATE POLICY "Creator can share videos on their own contracts" ON public.contract_video_shares
  FOR INSERT WITH CHECK (
    creator_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.contracts
      WHERE contracts.id = contract_video_shares.contract_id
      AND contracts.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creator can remove their own shared videos" ON public.contract_video_shares;
CREATE POLICY "Creator can remove their own shared videos" ON public.contract_video_shares
  FOR DELETE USING (creator_id = auth.uid());

COMMENT ON TABLE public.contract_video_shares IS
  'Videos que el creador comparte explícitamente con la empresa de un contrato puntual. La empresa NUNCA ve más que esto si la cuenta del creador está marcada como personal (ver handle_requests.handles[].accountType).';
