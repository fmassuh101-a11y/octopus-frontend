# Plan Maestro Octopus — Julio 2026

Basado en: `INVESTIGACION_NICHO_2026-07_OLA1.md` + `INVESTIGACION_NICHO_2026-07_OLA2.md` + auditoría de seguridad del código.

## La tesis (una frase)

**La primera plataforma en español que une gigs UGC + clipping pay-per-view verificado por API + contenido faceless, con pagos rápidos en CLP, boleta SII automática y fees públicos.**

Por qué ahora: SideShift (iOS/inglés, US$2.18M de caja) no puede atender LATAM; VoxFeed murió y dejó huérfana su base chilena; los clippers chilenos no tienen TikTok Creator Rewards (Chile excluido); Ampli anunció expansión a Chile y ClipBoom crece en España — **la ventana se mide en meses**.

## Posicionamiento vs. competidores directos

| Competidor | Su debilidad | Nuestro golpe |
|---|---|---|
| SideShift | iOS/inglés, Trustpilot 2.6, pagos opacos | Android/web, español, reglas de pago públicas |
| UGCya (Chile) | Solo gigs UGC, sin clipping ni verificación API | Los 3 verticales en una plataforma |
| Whop Content Rewards | Inglés, retención 30 días, fraude de bots | Retención 72h, garantía anti-bots, español |
| ClipBoom (España) | Sin rieles LATAM confirmados, comisión oculta | CLP nativo + boleta SII + fee público |
| eGLOW/Fluvip | Agencias enterprise, venta consultiva | Self-service para pymes desde $500.000 CLP |

## Modelo de negocio

- **Gigs UGC**: transaccional, fee **15% público** a la marca. Creador fija precio en rangos sugeridos ($40.000–$120.000 CLP/video, anclado a tarifas de mercado). Derechos comerciales incluidos; whitelisting +30-50% como upsell. 0% de comisión visible al creador.
- **Clipping**: marca deposita presupuesto (mínimo $500.000 CLP), fija CPM US$0.50–$3.00/1.000 views. Fee **10%** a la marca. Min payout ~2.000 views, max payout por clip, retención 72h, clawback 3 días.
- **Faceless**: tipo de gig al mismo pricing UGC.
- **Fase 2 — Plan Pro marcas**: ~$70.000 CLP/mes (fee reducido 10%/7%, ilimitado, analytics). Bajo el piso de Influee (€99) y SideShift ($199+).
- **Pasarelas**: Flow (suscripciones), Khipu (depósitos grandes, 0.69%), MercadoPago Split (retención automática de fee). Stripe NO opera en Chile.
- **Payouts**: Whop donde el riel CLP funcione (TESTEAR EMPÍRICAMENTE — tarea crítica) + transferencia CLP local como riel premium "sin fee de conversión".

---

## FASE 0 — Resucitar (esta semana)

1. ✅ Script maestro SQL listo (con fixes de seguridad).
2. ✅ Config Supabase centralizada; auditoría de seguridad aplicada (6 rutas con auth JWT, test-routes eliminadas, secrets fuera del código, webhook con HMAC).
3. ⬜ Proyecto Supabase nuevo (región São Paulo) → correr script → pasar llaves → actualizar `.env.local` + Vercel.
4. ⬜ **Rotar TikTok Client Secret y Gemini API key** (comprometidos en git).
5. ⬜ Commit + push de todos los fixes (dispara redeploy de Vercel).
6. ⬜ Probar flujo completo: registro → onboarding → gig → aplicación → contrato.
7. ⬜ **Test empírico del retiro Whop con cuenta bancaria chilena** — define la arquitectura de payouts.

## FASE 1 — MVP confiable (semanas 1–3)

Objetivo: que el marketplace de gigs UGC funcione de punta a punta y sea seguro.

1. Middleware server-side real (`@supabase/ssr` + cookies) — protege `/admin`, `/creator/*`, `/company/*`. Cierra el pendiente #1 del audit.
2. Tokens TikTok fuera de `profiles.bio` → tabla `verified_accounts` (pendiente #2 del audit).
3. **Cobro a empresas v1**: depósito de campaña vía Flow o MercadoPago → saldo en wallet interna (escrow) → liberación al aprobar contenido. Reusar `process_payment()` que ya existe en la DB.
4. Página de precios pública (15% gigs / 10% clipping) — ningún competidor la tiene; es marketing gratis.
5. T&C chilenos: rol de intermediario, licencia comercial perpetua no exclusiva por defecto, retracto 10 días (Ley Pro-Consumidor), privacidad (prepararse para Ley 21.719, vigente 1-dic-2026).
6. TikTok OAuth: recuperar o recrear la app en developers.tiktok.com; si es nueva, actualizar client key + redirect URI.

## FASE 2 — Clipping v1, el diferenciador (semanas 4–8)

1. **YouTube Shorts primero**: verificación de views por API pública (sin OAuth, sin review, ~500k videos/día gratis).
2. Estructura de campaña calcada de Whop Content Rewards: presupuesto + CPM + min/max payout + aprobación de marca.
3. Antifraude v1: aprobación manual, retención 72h, ratio views/engagement, clawback 3 días, regla de permanencia del clip.
4. **Boleta SII automática** en cada payout (RUT genérico 44.444.447-9, Res. 128/2025; retención 15,25% desde 2026) — el moat que nadie puede copiar rápido.
5. TikTok/Instagram por URL con revisión manual ("views no verificadas") mientras no aprueben las APIs.
6. Iniciar Meta App Review (Instagram Reels) en paralelo desde la semana 1 de esta fase.

## FASE 3 — Tracción (meses 3–4)

1. **Reclutar creadores**: grupos de Facebook UGC en español (el dolor #1 ahí es el impago — nuestro pitch), partnership con academias UGC (UGC Academy, @ugc_chile con 15k seguidores), pitch "gana US$500+/mes extra".
2. **Primeros 10 clientes** (en orden de calor): Tenpo Bank (lanzando marca AHORA), Buk (declaró duplicar marketing), AgendaPro (clientes viven en IG/TikTok), Global66, Fintual, Examedi, Houm + agencias revendedoras.
3. **Octopus se promociona con su propia mecánica**: primera campaña de clipping = clips sobre Octopus (playbook con el que Whop llegó a $142M ARR).
4. Postular a **Start-Up Chile / Platanus Ventures** con la narrativa first-mover (cero competencia local financiada).
5. TikTok Display API production review (flujo completo en Sandbox primero).

## FASE 4 — Escala (meses 5–6)

1. Línea faceless/AI-UGC en español (mix 80/20: creadores humanos ancla + variaciones AI).
2. Plan Pro suscripción para marcas.
3. Expansión: México → Colombia → Argentina (Brasil al final o nunca — saturado en portugués). Precios localizados por país (rates difieren ~2x).
4. PWA instalable + push web; evaluar app nativa (Expo) — ojo con políticas de stores sobre apps de payouts.
5. "Octopus Academy" con badge (copia del Bootcamp de SideShift).

## Marca

- Evaluar conflictos del nombre "Octopus" (Octopus Energy, Octopus Deploy) antes de invertir en marca — alternativas con dominio: getoctopus.cl, octopus.lat, joinoctopus.com (ver informe Ola 2).
- Tono local: referentes NotCo/Fintual/Buk (cercano, directo, sin corporativismo).

## Métricas norte (primeros 6 meses)

- 500 creadores registrados con al menos 1 red conectada
- 20 marcas pagando (mix gigs + clipping)
- $10M CLP procesados con 0 disputas de pago no resueltas
- Payout promedio ≤72h post-aprobación (publicarlo en la home)

## Riesgos activos

1. Riel CLP de Whop sin confirmar → test empírico YA.
2. TikTok app review impredecible → por eso YouTube primero.
3. Ampli aterrizando en Chile / Whop localizando al español → velocidad.
4. Ley 21.719 vigente 1-dic-2026 → compliance de datos antes de esa fecha.
5. Mantener saldos de terceros puede rozar la Ley Fintech 21.521 (CMF) → consultar abogado al estructurar el escrow.
