-- Columnas que la app usa en applications y no estaban (anti-ghosting + bookmarks)
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS bookmarked BOOLEAN DEFAULT false;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS messaged_at TIMESTAMPTZ;
NOTIFY pgrst, 'reload schema';
SELECT 'Columnas de applications agregadas (reviewed_at, bookmarked, messaged_at)' AS status;
