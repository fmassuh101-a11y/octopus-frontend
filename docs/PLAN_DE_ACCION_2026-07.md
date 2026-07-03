# Plan de acción Octopus — Julio 2026

Estado hoy: DB nueva funcionando · registro/login arreglados (fetch directo) · rediseño oscuro+esmeralda completo, sin emojis, nav consistente · nivel de creador agregado · **todo en localhost, sin deploy con la DB nueva** · 120 cambios sin commitear.

Lo que FALTA para tener producto real: deploy a Vercel · cobro a empresas · contratos reales end-to-end · clipping · verificación de redes · seguridad.

---

## FASE 1 — Dejarlo VIVO en internet (hoy/mañana) · ~1-2 h

Objetivo: que la app funcione en Vercel con la DB nueva, para la gente.

**1.1 — Commit + push del rediseño** (yo)
- 120 archivos cambiados (rediseño, auth, nav). Commitear y push a GitHub → Vercel redespliega solo.
- Antes: correr `npm run build` (ya pasa) y confirmar.

**1.2 — Actualizar variables en Vercel** (vos, te guío clic a clic)
- Vercel → proyecto `octopus-frontend` → Settings → Environment Variables.
- Actualizar 3: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` con los valores del proyecto nuevo (`cnsyrgurwtufbynwrxjt`).
- Actualizar `NEXT_PUBLIC_APP_URL` → `https://octopus-frontend-tau.vercel.app`.
- Redeploy.

**1.3 — Configurar Auth URLs en el Supabase nuevo** (vos)
- Ya lo hiciste en localhost; confirmar que el Site URL/Redirect incluyan el dominio de Vercel.

**1.4 — Rotar 2 secretos comprometidos** (vos, 5 min) — CRÍTICO seguridad
- TikTok Client Secret + Gemini API key (quedaron en el historial de git). Generar nuevos y ponerlos en `.env.local` + Vercel.

**1.5 — Smoke test en producción** (yo + vos)
- Registrarse, onboarding, publicar gig, aplicar — en el Vercel real.

---

## FASE 2 — El flujo de trabajo REAL end-to-end (2-4 días) · lo más importante

Objetivo: que una empresa contrate a un creador y el trabajo se complete de verdad.

**2.1 — Contratos reales**
- Verificar/arreglar: empresa crea contrato → creador lo ve → acepta/rechaza → entrega contenido → empresa aprueba → se libera pago.
- Ya existe la base (`contracts`, `contract_submissions`, `content_deliveries` en la DB). Falta probar y arreglar cada paso.
- Archivos: `app/company/contracts`, `app/creator/contracts`, `app/creator/deliveries`, `app/company/review-content`.

**2.2 — Anti-ghosting (feature SideShift)** · SQL requerido
- Mostrar al creador si la empresa vio su aplicación ("Vista ✓" / "Aún no vista").
- SQL: `ALTER TABLE applications ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;`
- Empresa: marcar `viewed_at` al abrir un aplicante. Creador: badge en `app/creator/applications`.

**2.3 — Verificación de redes (TikTok)**
- El TikTok OAuth está a medio arreglar (últimos commits de feb). Terminar el flujo: conectar cuenta → guardar en `verified_accounts` (no en `profiles.bio`).
- Plan B mientras TikTok no aprueba: verificación por código-en-bio (lo investigamos).

---

## FASE 3 — COBRO a empresas (3-5 días) · sin esto no hay negocio

Objetivo: que la empresa pueda pagar dentro de la app. HOY no existe (0 líneas).

**3.1 — Integrar pasarela chilena**
- **Flow** (suscripciones + pago único) o **MercadoPago** (tiene Split de pagos nativo). Investigado en `docs/`.
- Crear ruta `app/api/payments/*` para: crear orden → webhook de confirmación → acreditar saldo en wallet interna.
- La empresa deposita presupuesto → escrow interno → se libera al creador al aprobar contenido (la función `process_payment` ya existe en la DB).

**3.2 — Boleta SII automática (moat local)**
- Al pagar al creador, emitir boleta de honorarios al RUT genérico 44.444.447-9 (Res. SII 128/2025). Ningún competidor lo tiene.

---

## FASE 4 — CLIPPING, el diferenciador (1-2 semanas) · la apuesta grande

Objetivo: pagar por views (pay-per-view), lo que nadie hace en LATAM.

**4.1 — Módulo de campañas de clipping**
- Empresa crea campaña: presupuesto + CPM ($ por 1000 views) + min/max payout por clip + plataformas.
- Creador se une, sube el link del clip.
- Nuevas tablas: `clip_campaigns`, `clip_submissions`.

**4.2 — Verificación de views por API (empezar por YouTube)**
- YouTube Data API: da views de cualquier video **sin OAuth, gratis** → el más fácil, lanzar con este.
- Después Instagram/TikTok (requieren app review).
- Necesitás: crear una API key de YouTube en Google Cloud (te guío).

**4.3 — Anti-fraude v1**
- Aprobación manual + retención 72h + ratio views/engagement + clawback. Sin esto el clipping muere.

---

## FASE 5 — Seguridad y escala (continuo)

- **Middleware real** (`middleware.ts` hoy es no-op): proteger `/admin`, `/creator/*`, `/company/*` server-side.
- Sacar tokens de `profiles.bio` → `verified_accounts`.
- Migrar sesión de localStorage a cookies httpOnly (arregla de raíz los cuelgues de Supabase).
- Rate limiting + WAF de Vercel (anti-bots).

---

## Orden recomendado

1. **Fase 1 (deploy)** — para que esté vivo ya.
2. **Fase 2 (contratos reales + anti-ghosting)** — el corazón del producto.
3. **Fase 3 (cobro)** — para monetizar.
4. **Fase 4 (clipping)** — el diferenciador que nos hace únicos.
5. **Fase 5 (seguridad)** — en paralelo, antes de crecer.

## Lo que vos tenés que hacer (resumen)
- Vercel: actualizar 3-4 env vars + redeploy (Fase 1).
- Rotar TikTok secret + Gemini key (Fase 1).
- Correr algún SQL puntual cuando lo diga (anti-ghosting, clipping).
- Crear API key de YouTube en Google Cloud (Fase 4).
- Decidir pasarela de pago: Flow vs MercadoPago (Fase 3).
