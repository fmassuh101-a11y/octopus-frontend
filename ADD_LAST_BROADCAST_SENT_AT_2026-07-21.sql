ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS last_broadcast_sent_at TIMESTAMPTZ;
