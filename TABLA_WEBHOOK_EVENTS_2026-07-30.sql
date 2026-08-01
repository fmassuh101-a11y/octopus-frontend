-- Tabla para no procesar dos veces el mismo aviso de Whop.
--
-- POR QUÉ HACE FALTA
-- Whop reintenta los avisos por diseño cuando no recibe respuesta a tiempo.
-- Sin registro de lo ya visto, un reintento duplicaba filas en `payouts`,
-- `withdrawals` y `company_topups` — y, peor, podía acreditar dos veces un
-- depósito.
--
-- El identificador viene en la cabecera webhook-id y es único por evento.
-- La clave primaria es la que hace el trabajo: si dos reintentos llegan a la
-- vez, solo uno logra insertar y el otro se corta.

CREATE TABLE IF NOT EXISTS public.webhook_events (
  event_id   text PRIMARY KEY,
  type       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Nadie más que el servidor la toca.
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.webhook_events FROM anon, authenticated;

-- Para limpiar lo viejo sin escanear la tabla entera.
CREATE INDEX IF NOT EXISTS webhook_events_created_idx
  ON public.webhook_events (created_at);
