-- Trackea a quién ya se le mandó el email de bienvenida, para que el botón
-- de "mandar bienvenida a los que ya estaban anotados" (en /admin/waitlist)
-- se pueda apretar varias veces sin duplicar envíos — útil porque el plan
-- gratis de Resend tiene tope de 100 emails/día, así que con 126+
-- inscriptos el primer click manda a 100 y el resto queda pendiente para
-- el día siguiente, automáticamente, sin tener que llevar la cuenta a mano.
-- Pegar en el SQL Editor de Supabase.

ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS welcome_sent_at TIMESTAMPTZ;
