# 📚 Índice maestro de documentación — Octopus

Actualizado: 3 de julio 2026. Empezá por acá.

## 🎯 Para el día de trabajo (leer en este orden)

1. **[AGENDA_BATALLA_2026-07-03.md](AGENDA_BATALLA_2026-07-03.md)** — el plan del día en bloques, con qué hacés vos y qué hago yo.
2. **[PLAN_MAESTRO_2026-07.md](PLAN_MAESTRO_2026-07.md)** — la estrategia completa en fases (0 a 4), pricing, modelo de negocio, métricas norte.

## 🔬 Investigación (julio 2026) — la base de todo

3. **[INVESTIGACION_NICHO_2026-07_OLA1.md](INVESTIGACION_NICHO_2026-07_OLA1.md)** — SideShift a fondo, economía del clipping (CPMs reales), mapa competitivo global, APIs de verificación de views, LATAM/Chile, estrategia. *136 hallazgos, 108 fuentes.*
4. **[INVESTIGACION_NICHO_2026-07_OLA2.md](INVESTIGACION_NICHO_2026-07_OLA2.md)** — ecosistema creator LATAM, pipeline de clientes con nombres (Tenpo, Buk, Global66...), naming/branding, auditoría de seguridad del código, legal Chile, camino a app móvil.
5. **[BLUEPRINT_SIDESHIFT_V2_2026-07.md](BLUEPRINT_SIDESHIFT_V2_2026-07.md)** — la app ACTUAL de SideShift pantalla por pantalla + tabla de 27 features "qué copiar / qué mejorar / qué descartar".
6. **[INVESTIGACION_NICHO_2026-07_OLA3.md](INVESTIGACION_NICHO_2026-07_OLA3.md)** — verificación por código-en-bio (paso a paso Whop), anti-bots + score de autenticidad (señales concretas con umbrales), APIs YouTube/IG/TikTok con pasos y tiempos, cómo creció SideShift, features nuevas, UI/microcopy. *98 hallazgos.*
7. **INFORME OLA 4** *(en curso — se guarda al terminar)* — web app de marcas pantalla por pantalla, disputas/reembolsos/ratings, SideShift vs Whop vs clipping apps, legal/T&C, copy de onboarding, módulo de clipping al detalle.

## 💰 Pagos (investigación previa, sigue válida)

7. **[WHOP_PAYOUT_INTEGRATION.md](WHOP_PAYOUT_INTEGRATION.md)** — Whop para payouts a creadores.
8. **[MERCADOPAGO_CHILE_RESEARCH.md](MERCADOPAGO_CHILE_RESEARCH.md)** / **[FLOW_CHILE_RESEARCH.md](FLOW_CHILE_RESEARCH.md)** — cobro a empresas en Chile.
9. **[PAYMENT_MODELS_DEEP_RESEARCH.md](PAYMENT_MODELS_DEEP_RESEARCH.md)** — modelos de pago del rubro.

## 📄 Contexto / histórico (referencia, algo desactualizado)

- [SIDESHIFT_RESEARCH.md](SIDESHIFT_RESEARCH.md) — research de SideShift de feb 2026 (superado por Ola 1 + Blueprint v2).
- [CONTENT_APPROVAL_WORKFLOW.md](CONTENT_APPROVAL_WORKFLOW.md) — flujo de aprobación de contenido ya implementado.
- [PLAN_DESARROLLO_OCTOPUS.md](PLAN_DESARROLLO_OCTOPUS.md) / [REPORTE_FINAL_OCTOPUS.md](REPORTE_FINAL_OCTOPUS.md) — planes viejos (superados por PLAN_MAESTRO).

## 🗄️ Base de datos y setup (fuera de docs/, en la raíz de frontend/)

- **`../MASTER_DATABASE_SETUP_2026-07.sql`** — script único para levantar toda la DB (22 tablas, con fixes de seguridad). Pegar en Supabase SQL Editor.

## 🔒 Seguridad — estado

Aplicado (jul 2026): auth JWT en 6 rutas API, eliminadas rutas test-* peligrosas, secrets fuera del código, webhook Whop con HMAC, RLS corregido en el master SQL.
**Pendiente ⚠️:** rotar TikTok Client Secret + Gemini key (comprometidos en git); middleware server-side; sacar tokens TikTok de `profiles.bio`.
