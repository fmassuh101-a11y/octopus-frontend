-- Agrega "¿cómo nos encontraste?" y un mensaje libre a la lista de espera
-- (pedido de Felipe, 20 jul 2026). Depende de: WAITLIST_SETUP.sql.
--
-- Igual que con el país: el código ya tiene respaldo y sigue guardando los
-- registros aunque estas columnas no existan todavía — pero hasta que corras
-- esto, esos dos datos NO se guardan. Pegalo apenas puedas.

ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS message text;
