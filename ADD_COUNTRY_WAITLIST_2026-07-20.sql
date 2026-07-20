-- Agrega el campo "país" a la lista de espera (pedido de Felipe, 20 jul 2026,
-- con gente postulando en vivo desde la campaña de SideShift).
-- Depende de: WAITLIST_SETUP.sql (la tabla `waitlist` ya debe existir).
--
-- No es urgente en el sentido de "todo se rompe si no lo pegás ya": el código
-- ya tiene un respaldo que sigue guardando los registros aunque esta columna
-- no exista todavía. Pero hasta que corras esto, el país NO se guarda — se
-- pierde el dato de los que se anoten mientras tanto. Pegalo apenas puedas.

ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS country text;
