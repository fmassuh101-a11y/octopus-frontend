# Agenda de batalla — 3 de julio 2026

Objetivo del día: **app viva + segura + con la base del clipping**, aprovechando la sesión al máximo.

## Bloque 1 — Resucitar (primera hora, VOS + YO)

**Vos (15 min, en paralelo conmigo):**
1. Supabase: NO pagar los $25 (solo recuperaría datos de prueba). Borrar proyectos muertos del dashboard para liberar cupo (o cuenta nueva si insiste) → New project gratis, región **South America (São Paulo)** → SQL Editor → pegar `MASTER_DATABASE_SETUP_2026-07.sql` (con `! pbcopy < frontend/MASTER_DATABASE_SETUP_2026-07.sql` queda en el portapapeles) → Run.
2. Pasarme: Project URL + anon key + service_role key (Settings → API).
3. Gmail: buscar `from:tiktok.com` en fmassuh1111@, fmassuh133@ y fmassuh101@ para encontrar la cuenta de TikTok Developers (o probar "Log in with TikTok" con tu TikTok personal). Si no aparece en 10 min, creamos app nueva y listo.
4. Rotar la key de Gemini (aistudio.google.com → nueva key → me la pasás).

**Yo (apenas lleguen las llaves):**
5. Actualizar `.env.local` + fallback en `lib/config/supabase.ts`.
6. Build + probar registro → onboarding → gig → aplicación → contrato → chat.
7. Vercel: actualizar env vars y redeploy (te guío o lo hacés vos en 2 min).
8. Commit + push de todo lo acumulado (fixes de seguridad + refactor + docs).

## Bloque 2 — Seguridad restante (mediodía, YO)

9. Middleware server-side real (`@supabase/ssr` + cookies): protege `/admin`, `/creator/*`, `/company/*`. Incluye migrar la sesión de localStorage a cookies — el fix estructural que arregla de raíz los bugs de sesión de TikTok/Google de febrero.
10. Sacar tokens TikTok de `profiles.bio` → `verified_accounts`.
11. Test Whop con cuenta chilena (VOS: 5 min con tu cuenta bancaria a mano) — define la arquitectura de payouts.

## Bloque 3 — Lo nuevo que nos diferencia (tarde, YO con tu feedback)

12. **Página de precios pública** (15% gigs / 10% clipping) — ningún competidor la tiene; pura UI, sin dependencias.
13. **Módulo clipping v1 — cimientos**: modelo de campaña (presupuesto + CPM + min/max payout), UI de creación para marcas, y la librería de verificación de views por **YouTube Data API** (necesitás crear una API key gratis en Google Cloud — 2 min, te guío).
14. Repaso del **blueprint SideShift v2** (la investigación que corre esta noche) + tus 37 screenshots locales → decidir qué copiamos exacto en la UI.

## Bloque 4 — Cierre (fin del día)

15. Deploy de todo a Vercel + smoke test en producción.
16. Definir la semana: cobro a empresas (Flow/MercadoPago), T&C chilenos, boleta SII.

## Qué se puede hacer SIN Supabase (si la cuenta se demora)

Todo el Bloque 3 (precios, clipping UI, YouTube lib), el middleware (se escribe ya, se prueba después), T&C, landing v2, y el análisis de screenshots. **Supabase solo bloquea el testing end-to-end, no el desarrollo.**

## Recordatorios

- La key de Gemini vieja y el secret de TikTok viejo QUEDARON EN GITHUB → ambos se rotan sí o sí.
- Los 2 informes de investigación + plan maestro están en `frontend/docs/`.
- El blueprint de la app SideShift v2 se guarda en `frontend/docs/` apenas termine el workflow nocturno.
