# SideShift App 2026: Blueprint completo

Documento de referencia para el fundador de Octopus. Cada dato lleva su fuente. Lo que no pudimos verificar está explícitamente en la Sección 7 (huecos), no inventado.

---

## 1. La ficha y las versiones (qué es hoy la app, qué agregaron recientemente)

### 1.1 Ficha técnica (julio 2026)

| Campo | Valor | Fuente |
|---|---|---|
| Nombre | **"SideShift - Earn Money"**, subtítulo "Find jobs and get paid!" (id 6481115809) | App Store + iTunes Lookup API, 2 jul 2026 |
| Developer | SideShift Corporation (una sola app en App Store) | iTunes Lookup developer id 1739628168 |
| Versión actual | **2.18** (29 may 2026, "Bug fixes"); sin releases jun-jul 2026 | Version history App Store |
| Rating | 4.8/5 (averageUserRating 4.79844) con ~26.000 calificaciones | iTunes Lookup API |
| Tamaño / requisito | 357.3 MB; **requiere iOS 18.6+** (corta dispositivos viejos); solo inglés; edad 4+ | Ficha App Store |
| Categorías | Business + Education | Ficha App Store |
| Lanzamiento | 3 jun 2024 (URL legacy: "sideshift-gen-z-jobs") | Ficha App Store + URL legacy |
| **Android** | **NO EXISTE.** Solo iOS + web app (`app.sideshift.app` para marcas). La única "SideShift" en Google Play es el exchange cripto sideshift.ai (otra empresa) | Búsquedas Google Play, sideshift.app/creators, thankyou.sideshift.app/get-started |

### 1.2 El pivot: de job-board Gen Z a "sistema operativo de UGC"

- Origen 2024: app de empleos locales para universitarios ("Hiring Gen Z Made Simple", bundle "SideShift - Campus Jobs"). Su Linktree aún dice "Side Hustles Made Simple" (linktr.ee/sideshift.app).
- Hoy: la web no menciona "side hustle" en ningún lado; el pitch es **"The Operating System for Running UGC at Scale"** (sideshift.app, jul 2026). Monetizan a la marca (SaaS $299-999/mes), no principalmente al creador.
- **Lección clave para Octopus: copiar la versión B2B-first 2026, no el modelo viejo de tablero de empleos.**

### 1.3 Cronología de la V2 (roadmap 2025-2026, orden en que priorizaron)

Del version history de la App Store:

| Versión | Fecha | Qué agregaron |
|---|---|---|
| 1.77 | 9 sep 2025 | "New payout country support!" |
| 1.78 | 6 oct 2025 | "SideShift mobile now works with SideShift management!" |
| 2.0-2.01 | 11-19 dic 2025 | Base V2 + "Fixes payment bugs" |
| **2.02-2.04** | **23-24 feb 2026** | **"SideShift V2 is live!"** — relanzamiento total (la migración borró mensajes, jobs y hasta planes premium pagados de usuarios, según reviews) |
| 2.11 | 21 mar 2026 | **"Creator Shareable portfolio is now live!"** |
| 2.12 | 26 mar 2026 | **"Calling and bug fixes!"** (llamadas in-app) |
| 2.14-2.15 | 6 may 2026 | **"Communities and new chat!"** |
| 2.16-2.17 | 14-19 may 2026 | "New premium features" |
| 2.18 | 29 may 2026 | Bug fixes (actual) |

Además, ~jun 2026 lanzaron **SideShift Discover**: marketplace que conecta marcas con "UGC agencies, clippers, and campaign managers" — 50+ agencias operando y 7.000+ consultas mensuales de marcas al lanzar (LinkedIn de SideShift).

### 1.4 Advertencia crítica sobre los screenshots oficiales

**Los 8 screenshots de la ficha están DESACTUALIZADOS: muestran la app V1 de empleos de campus (bartenders, pizzerías, $16/HR), no la app UGC 2026** (inspección visual de los screenshotUrls de mzstatic.com, 2 jul 2026). SideShift actualizó la descripción tras el pivot pero nunca los screenshots. Sirven igual porque revelan patrones UI que persisten en la V2: perfil-como-postulación, tracker anti-ghosting de aplicaciones (chip "HASN'T SEEN"), wallet de empresa con "Balance + Add Funds", y decisión de candidatos con un botón (X / avión de papel).

### 1.5 Escala actual (social proof publicado)

1.000.000+ creadores (LinkedIn ~jul 2026; la web dice 700K-800K), 1.500+ marcas, $100M+ pagados, 5B+ views últimos 90 días; últimos 30 días: "2,500+ creators earned $2M+, 1B+ views, 1,000+ active UGC campaigns"; 10 creadores con +$100K acumulado; clientes citados: Brex, Kalshi, Cursor, Microsoft (LinkedIn + sideshift.app). **Dato demoledor: solo ~2.500 de 1M de creadores cobraron el último mes (0,25%); promedio ~$800/creador/mes.** Esa frustración masiva es el flanco de Octopus.

---

## 2. Flujo del creador pantalla por pantalla

El lado creador vive en la app iOS (la web casi no lo menciona). Flujo reconstruido de fuentes oficiales + reviews 2026:

### Paso 1 — Registro y onboarding
- Cuenta gratis ("Free to join · No subscription", sideshift.app/plans). Secuencia según reviews 2026: nombre → preguntas de perfil → pantalla con **"carousel of brands"** (review 14 mar 2026 reporta que se traba ahí) → verificación de email y teléfono → **permiso de ubicación obligatorio** (review 28 jun: "couldn't get past the location") → la app pide review de App Store apenas abres (27 may). (Feed RSS reviews iTunes)
- **Paywall temprano (~$10) en el signup**, antes de mostrar valor: "The subscription payment is processed immediately, but after paying, I was unable to properly use the platform" (23 jun); "Subscribed for 10$. Then it froze... said there's no account with my email" (17 jun). Es la queja #1 a NO copiar.
- Bug conocido: en pantallas chicas (iPhone SE/iPad) el botón Continue queda tapado por el teclado, sin scroll (reviews 16 may, 6 jun).

### Paso 2 — Perfil = "common application"
Microcopy literal del FAQ (sideshift.app/creators): *"complete your profile (think of it as a common application), and attach your social handles (Personal and/or UGC accounts) plus links to top-performing videos to help your profile stand out."* Recomiendan portafolio de 5-10 "spec videos" (demos, lifestyle, unboxings, tutoriales) alojado en el perfil de SideShift (blog "how to become a successful ugc creator in 2026"). El perfil ES la aplicación — no hay CV ni formularios por campaña.

- **Verificación TikTok con fricción**: para aplicar a la mayoría de gigs hay que copiar un código y pegarlo en el perfil de TikTok ("Something about copying a key, pasting it to TikTok", reviews 27 may y 18 ene). No hay evidencia de OAuth.
- Desde v2.11 (mar 2026): **portafolio compartible público** ("Creator Shareable portfolio is now live!").

### Paso 3 — Bootcamp / Badges (activación gamificada)
- "SideShift Bootcamp is a gamified training engine... turns them into a distribution machine for brands at scale" — sin experiencia ni followers requeridos (LinkedIn de SideShift).
- Bajo la sección **"Badges"** hay un curso UGC gratuito que otorga un **"verified badge"** que señala seriedad a las marcas (FAQ sideshift.app/creators).
- **Niveles**: "In V2... creators start as **Bronze** and level up based on reviews, performance, and course completion — think Duolingo for creators." Cada video da **XP** que "boosts your Creator Profile" (LinkedIn). Screenshots de terceros (mwm.ai) muestran secciones educativas "UGC Overview" / "Getting Started" con botones de play, y una pantalla de **Leaderboard** con ranking y puntos.
- Lawton (CEO): "a robust training engine to take anyone from a zero to one creator in just a couple of hours" (netinfluencer.com).

### Paso 4 — Feed de oportunidades
- Pantalla de Job Discovery con browse + **filtros por temas** ("Travel", "Food") (screenshots mwm.ai). Categorías publicadas: UGC creator jobs, Influencer brand deals, Paid content campaigns, Brand ambassador programs, Campus marketing jobs, Paid internships, Event staff roles, Remote side hustles (descripción App Store) + **clipping** pagado "per clip, per campaign, or on a hybrid commission structure tied to performance" (blog clipping-instagram).
- **One-Tap Apply**: "Apply to brand deals with one tap. No resumes or complicated applications... Get matched to campaigns based on your profile" (App Store). El plan free tiene **límite de aplicaciones**; SideShift Pro las hace ilimitadas.

### Paso 5 — Matching y selección
- "Automated screening + scheduling, every applicant in 24 hrs"; "90% of roles are filled in under three days" (homepage + blog sideshift-creator-discovery). Matching por: content style/niche, experiencia por industria (CPG, fashion, tech, gaming), señales de performance pasada (views, engagement) y audience alignment.
- Los seleccionados "join communication channels" — canales de campaña (entrevista Lawton, netinfluencer.com).

### Paso 6 — Trabajo (brief → entrega → aprobación)
- Todo nativo: "keeps every brief, deadline, chat scheduling detail, and deliverable native within the system"; la marca puede "brief creators, request revisions, approve submissions, and execute standard agreements in a single place" (blog + ToS). Hay pantalla de gestión de campaña con **calendario y lista de posts** (screenshots mwm.ai).
- Comunicación: chat nuevo + **Communities** (v2.14) + **llamadas in-app** (v2.12).
- Los creadores publican **desde sus propias cuentas** ("From their accounts", tabla homepage); IP y deliverables se transfieren a la marca "upon acceptance and payment" (ToS).
- Modalidad volumen documentada en reviews: campañas tipo **"20 videos in two weeks"** con pago al alcanzar umbral de videos/views (review 7 ene: "their system with hitting a certain amount of videos takes so long to resolve").

### Paso 7 — Wallet y analytics
- Pantalla **Wallet** con balance disponible y botón **"Withdraw"**; dashboard de Analytics con gráficos de Views y Engagement por campaña (screenshots mwm.ai).
- Copy oficial: "Track campaign performance including views, likes, and engagement. Monitor payouts in real time. Send invoices directly to brands... Know your numbers. Prove your value. Land bigger deals." (App Store) + "Earnings Transparency: see exactly what you've earned, what you're owed, and what's pending" (Whop case study / LinkedIn). Soporta 50+ modelos de compensación: fixed retainers, pay-per-post, performance-based tied to views, híbridos.

### Paso 8 — Retiro (withdrawal)
- KYC y payout **vía componentes embebidos de Whop**, "without leaving the platform": verificación de identidad → conectar destino → retirar. Métodos: "bank deposits, cryptocurrency, Venmo, CashApp" en "241+ territories" (whop.com/blog/sideshift, con quotes del cofundador/CTO Drew Levin). El KYC no es paso del registro: es gate previo al primer retiro.
- Promesas: "Instant payouts to your bank as soon as your work is approved", "Creators paid within 3 business days", "No payment processing fees", W9/1099 automáticos (US). Mueven "millions of dollars" semanales a 850k+ creadores (whop.com/blog/sideshift + sideshift.app/platform/payments). Lawton: pagos "99% automated" (netinfluencer.com).
- **Realidad según reviews**: demoras >1 semana con comunicación pobre ("Takes over a week to pay you"), y el ToS permite retener/revertir payouts (ver Sección 4).

### Monetización del creador (SideShift Pro)
IAPs listadas: SideShift Pro $9.99 (presumible mensual) y $79.99 (presumible anual), "SideShift Premium" $0.99 (x2), "Pro Membership" $249.99, más paquetes de saldo $25→$200 (lado empresa) (ficha App Store). Pro desbloquea: aplicaciones ilimitadas, early access a top brand deals, visibilidad premium, prioridad en gigs de pago alto (descripción App Store). Sin fees de plataforma sobre los pagos del creador (FAQ /creators).

---

## 3. Flujo de la marca pantalla por pantalla

El lado marca es web (`app.sideshift.app`); la home de sideshift.app ES la página de marcas (/brands da 404).

### Paso 1 — Entrada y segmentación
- /plans arranca con **"What best describes you?"** y 3 tarjetas: "For Brands — Find creators, launch campaigns, see what's working" / "For Agencies — Run UGC for every client from one place" (pricing propio) / "For Creators — Get discovered and paid by real brands" (gratis) (sideshift.app/plans).
- Trial: 7 días, "$0 today · Cancel anytime", "No credit card required", **"Post your first job in 4 minutes"** (go.sideshift.app); "Most brands get their first creator applications within 48 hours. No call required. No commitment" (thankyou.sideshift.app/get-started).

### Paso 2 — Crear campaña (Job Listing + brief)
- La unidad es el **"Job Listing"** (1/2/3 activos según plan). Componentes del brief según su guía: **Key product benefits, Target audience, Example hooks or angles, Clear deliverables (length, format, platform)**. Promesa: "post your first job in under 10 minutes" (blogs sideshift-creator-discovery y getting-started-with-ugc, /plans/brands).
- Modelo dual: **pull** (listing público que recibe aplicaciones inbound — "Instead of sending hundreds of DMs, brands receive inbound applications") + **push** (sistema de **Invites** directas desde el marketplace: 30/100/ilimitadas por plan).
- Upsell in-product: **Job Boosts** — "Boosts push your listing to the top of creator feeds for 48 hours, increasing applicant volume by ~3×" (verbatim, /plans/brands). 0/1/3 según plan.

### Paso 3 — Filtrar y elegir aplicantes
- Base de datos: "Search, Filter & Save the Right Creators Instantly" sobre 700K+ creadores vetted de **US, UK, Canadá y Australia** (no LATAM). Filtros: plataforma (IG/TikTok/YouTube/Facebook), nicho, demografía de audiencia, engagement rate, follower count, ubicación. Card de creador: nombre, foto, rating de estrellas, país (ej. "Shelly 5.0 United States") (/platform/influencer-database y /platform/creator-marketplace).
- Perfiles con "Performance data & past work visible upfront" (vs "media kits and guesswork"): performance pasada, calidad de audiencia, historial de colaboraciones, engagement, conversion stats (homepage + influencer-database).
- Screening automático: "Automated screening + scheduling, every applicant in 24 hrs"; "automated interview flows and notifications" (homepage + moge.ai/product/sideshift). Herencia UI de la V1: decidir candidato con un solo botón (X / aceptar) sobre su perfil completo (screenshots oficiales).

### Paso 4 — Gestionar y aprobar
- "Brief-to-delivery pipeline" con "real-time deliverable tracking" y "brand guideline enforcement"; briefs, aprobaciones, mensajes y pagos en una sola interfaz; "Message, hire, and brief — all in-app" (/platform/campaign-management, /pricing).

### Paso 5 — Analytics
- Métricas confirmadas: **views, reach, engagement, conversions en tiempo real**, "from impression to conversion", comparar creadores entre sí y por campaña, identificar "top creators and formats instantly"; su blog 2026 promociona **ROAS, CTR, Hook Rate** y comparativas entre campañas (/platform/reporting + blog). Posicionamiento: "Real-time dashboard" vs "Spreadsheets" (DIY) vs "Monthly PDF" (agencia).

### Paso 6 — Pagar
- **La aprobación dispara el pago**: "Real-time tracking ensures creators are paid automatically once deliverables are approved"; "One-click payouts, automated bonuses"; pago al creador ≤3 días hábiles (vs Net-30); "automatic W9 collection and 1099 filing"; "system-validated, zero duplicate payments"; multi-moneda; bonos por performance (/platform/payments + homepage + blog).
- Financiamiento: suscripción SaaS + **"Creator payments are separate and on top of the subscription"**; "No payment processing fees" (hyred.com/sideshift-comparison + /platform/payments). Wallet de empresa con saldo precargado: patrón "Balance + Add Funds" (screenshots V1) coincide con los IAPs "$25/$50/$75/$100/$200 Dollars" de la ficha.
- **Queja de marcas documentada**: cargos no autorizados a tarjetas "up to ten times per day" (Trustpilot).

### Pricing 2026 (subió ~50% respecto a 2025)
Vigente en /platform/* (los precios viejos $199/$299 aún circulan en fuentes 2025):

| Plan | Precio | Incluye |
|---|---|---|
| Starter | **$299/mo** | 5 creators, "Typical output: 250+ videos/mo", 1 Job Listing, 30 Invites |
| Growth ("Most Popular") | **$499/mo** | 15 creators, 500+ videos/mo, 2 Listings, 100 Invites, 1 Job Boost, soporte teléfono+email |
| Scale | **$999/mo** | creators ilimitados, 1.000+ videos/mo, 3 Listings, Invites ilimitados, 3 Boosts, "24/7 Founder support via direct Slack access" |
| Enterprise | custom (~$10K+/mo) | "Done-for-you UGC at scale", estratega senior, weekly check-ins, "We run it, you approve" |

Anual = 30% dcto. Venden por **output esperado (videos/mes)** y capacidad, no por asientos ("250+ videos/month possible" vs "1–2 posts per influencer per month") (/platform/creator-marketplace, /pricing).

---

## 4. El sistema de rewards/views al detalle

**Hallazgo central: SideShift NO tiene un producto "Rewards" tipo CPM público.** Su modelo (blogs clipping-instagram y ugc-creator-payments):

1. **Tres estructuras de pago**: por clip (fee fijo por video), por campaña completa, o **híbrido: fee base + bono ligado a performance** (views/engagement/conversiones). Soportan modelo CPM/cost-per-view en clipping.
2. **Bonos automatizados**: "Performance-linked bonus structures tied to views, engagement, or conversions"; "Automated payouts immediately after content approval with no manual transfers"; "Creator payment status visible in real time to reduce disputes".
3. **Umbrales por volumen** (evidencia de reviews): campañas "20 videos in two weeks" donde se cobra al alcanzar cierto número de videos/views; la liquidación de esos umbrales demora ("takes so long to resolve", review 7 ene).
4. **Verificación de views**: NO hay evidencia pública de OAuth con TikTok/IG. Piden handles + links a videos; la verificación de colaboración es **pegar un código en el perfil de TikTok** (reviews). El mecanismo técnico del tracking (API vs scraping vs link submission) no está documentado. — *Octopus ya tiene OAuth de TikTok implementado: ventaja directa.*
5. **Reglas de descalificación (ToS literal)**: SideShift puede "delay, withhold, suspend, or reverse any Creator payout" si (1) el cliente disputa dentro de la ventana de aceptación/disputa; (2) falla el pago del cliente o hay chargeback; (3) sospecha de fraude/mal uso; (4) los deliverables son "removed, deleted, made private, or otherwise fail to meet Campaign requirements"; (5) lo exige la ley/procesador. Y: **"SideShift does not guarantee payment for any Deliverables and is not responsible for a Client's failure or refusal to pay."** (sideshift.app/terms-of-service). Video borrado o puesto en privado = pago perdido.
6. **Rates efectivos observados (lado marca, case studies oficiales)**: YikYak $25K → 23.6M views = **$1.1 CPM** con 3.000 posts (~$8.3/post promedio al creador — muy poco); PhotoGeniq $20K → 214M views = **~$0.10 CPM**; Brex "sub-$5 CPM". Rango real de campañas: **$0.10–$5 CPM efectivo** (sideshift.app/casestudies).
7. **Engagement mecánico**: leaderboard de creadores (por competencia + comunidad: "These creators become friends with one another and start to help each other", Lawton) + XP por video que sube el Creator Profile.
8. Referencia del modelo CPM puro que SideShift NO hace: Content Rewards/Whop ("brands post a bounty (e.g. $1 per 1K views)... creators clip and post... earn payouts based on how those clips perform") (contentrewards.com/blog/sideshift-alternatives). **Octopus puede combinar ambos: fee base híbrido estilo SideShift + CPM público transparente estilo Whop.**

---

## 5. Diseño y lenguaje

### 5.1 Home de sideshift.app, sección por sección (fetch directo jul 2026)
(1) Hero: **"The Operating System for Running UGC at Scale"** + subhead "Recruit UGC creators, manage campaigns, track results, and pay them automatically — from one operating system" + CTAs "Start Your Free Trial" / "Book a Demo" → (2) "Trusted By Top Brands Worldwide" (carrusel infinito de ~10 logos) → (3) "The Numbers That Power SideShift" (4 stats: 1,500+ Brands / 700,000+ Creators / 5B+ Views last 90 days / $100M+ Paid Out) → (4) testimonios "Trusted by 1500+ brands" → (5) "How SideShift Works for Brands" → (6) "One Platform for All Your UGC Campaigns" (4 features) → (7) tabla "The new standard for creator marketing" → (8) showcase de creadores por industria → (9) case studies "Brands Love SideShift" → (10) CTA final "Launch Your UGC Campaign Today" → (11) FAQ acordeón (15 preguntas) → (12) footer.

Visual: tema claro (blanco + navy) con dark mode, sans-serif limpia, imágenes .avif/.svg, placeholders de video con play, tabla comparativa de 3 columnas, FAQ con chevron.

### 5.2 Nav y arquitectura de información
Nav: Platform | Solutions | Pricing | Resources | For Creators | Log in | Start Free Trial. Bajo Platform: Creator Marketplace, Influencer Database, Campaign Management, Reporting, Payments. SEO programático: /platform/[red social] (instagram/tiktok/youtube/facebook) + 11 verticales de industria. La web pública es 100% brand-side; creadores relegados a un link (fetches directos).

### 5.3 Vocabulario (glosario para el copy de Octopus)
Trabajos = "gigs" / "campaigns" / "opportunities"; unidades de pricing = "Job Listing", "Invites", "Job Boost"; creadores = "creators / UGC creators / talent / vetted creators", el conjunto contratado = "your roster"; pagos = "payouts", "one-click payouts", "automated bonuses", "invoices"; brief = "briefs" (fetches directos de /, /creators, /platform/creator-marketplace).

### 5.4 Los 4 pilares de producto (repetidos en todo el sitio)
"**Source Creators** — Reach thousands of creators instantly." / "**Track Performance** — See content, views, engagement, and conversions in real time." / "**Automate Payments** — Handle payouts and invoices without manual work." / "**Manage Creators** — Organize your roster and run campaigns seamlessly." (homepage + /platform/tiktok).

### 5.5 Tabla comparativa (el arma de venta — posicionan contra DIY y agencias, no contra otros SaaS)
Filas verbatim: Creator access: "700K+ vetted creators apply to you" vs "Cold DMs, 80% ghosting" vs "Small roster, limited options" · Communication: "Briefs, chat, scheduling — one place" vs "iMessage + Slack + IG DMs" vs "Weeks of back-and-forth" · Analytics: "Real-time performance dashboard" vs "Spreadsheets" vs "Monthly PDF (maybe)" · Payments: "One-click payouts, automated bonuses" vs "Manual Venmo / bank transfers" vs "Baked into the 5-figure retainer" · Screening: "Automated screening & scheduling, every applicant in 24 hrs" vs "Calendly + email + follow-ups" (homepage). *Adaptación Chile: Venmo → transferencia bancaria; iMessage → WhatsApp.*

### 5.6 Lado creador (/creators)
Hero: "The UGC Platform for Creators" + "SideShift connects you directly with leading brands, handles the contracts and payouts, and lets you focus on creating." CTAs: "Join as a Creator" / "Explore Gigs". Secciones: Brands You'll Create Content For / The Largest UGC Creator Network / How SideShift Works / Everything Creators Need in One Dashboard / testimonios / FAQ. Testimonios = estudiantes con cifras concretas: Timmy Koltermann "$7k+/month" a los 6 meses; Ayomide Somorin (estudiante first-gen, flexibilidad) (fetch directo).

### 5.7 Descripción App Store (pitch mobile, 4 pilares)
"SideShift is the best place to become a creator, work with top brands, and get paid fast... Turn your content into income." Secciones: GET PAID TO WORK WITH TOP BRANDS / MANAGE YOUR CREATOR BUSINESS ("not just a job board. It is your creator management hub... Know your numbers. Prove your value. Land bigger deals.") / FAST AND RELIABLE PAYOUTS ("No more waiting weeks to get paid") / SIDESHIFT PRO. Cierre: "Start your creator journey today. Download SideShift and get paid to create." (ficha App Store).

### 5.8 FAQ homepage (mapa de objeciones que decidieron responder)
15 preguntas, entre ellas: Does SideShift cost money? / UGC vs. Influencer Marketing / Self-serve vs. Managed Service / How fast can I hire creators? / **How do I know creators won't ghost my campaign?** / How does SideShift compare to hiring an agency? / **My team is small — can we actually manage this?** / What happens during the free trial? (fetch directo). Checklist directo para el FAQ de Octopus.

### 5.9 Formato de case study que convierte
Template: [X]M views + métrica de negocio + ventana 30-60 días. Ejemplos: Yik Yak 25M views, 12.3% engagement; Remini 20M en 60 días; Brex 5.1M+ a sub-$5 CPM; Cerca 4x installs en 4 semanas; PhotoGeniq 100x user growth en 30 días (sideshift.app/casestudies). Octopus debería instrumentar sus primeras campañas para producir exactamente estos números.

---

## 6. Qué copiar y qué mejorar para Octopus

| # | Feature de SideShift 2026 | Fuente | Veredicto | Nota |
|---|---|---|---|---|
| 1 | Perfil "common application" + one-tap apply (perfil = postulación, sin CV) | /creators FAQ, App Store | **COPIAR IGUAL** | Coincide con onboarding 8 pasos de Octopus; agregar top videos + spec portfolio nativo |
| 2 | Bootcamp: curso gratis → verified badge → XP por video → niveles Bronze+ → leaderboard | LinkedIn, netinfluencer, mwm.ai | **COPIAR IGUAL** | Su feature de activación más distintiva; "Duolingo for creators" |
| 3 | Tracker anti-ghosting de aplicaciones (estado "HASN'T SEEN" etc.) | Screenshots V1 | **COPIAR IGUAL** | Barato, ataca la queja #1 del sector (ghosting) |
| 4 | Screening automatizado 24h + "90% roles filled <3 days" | Homepage, blog | **COPIAR IGUAL** | Benchmark operativo; empezar con matching simple por nicho/nivel |
| 5 | Flujo brief → chat nativo → submit → revisiones → aprobar → pago automático ≤3 días | /platform/payments, campaign-management | **COPIAR IGUAL** | La aprobación dispara el payout; calendario de deadlines como pantalla propia |
| 6 | Wallet creator: disponible / pendiente / adeudado + botón Withdraw + KYC Whop embebido al primer retiro | mwm.ai, whop.com/blog/sideshift | **COPIAR IGUAL** | Valida el plan Whop de Octopus (docs/WHOP_PAYOUT_INTEGRATION.md); KYC como gate de retiro, no de registro |
| 7 | Modelo dual pull/push: Listing público + Invites con cupo por plan + Job Boost 48h "~3× aplicantes" | /plans/brands | **COPIAR IGUAL** | Las 3 palancas de upsell (listings/invites/boosts) son clonables 1:1 |
| 8 | Pricing por output (videos/mes) con tiers y trial 7 días sin tarjeta, "primer job en 4 minutos" | /pricing, go.sideshift.app | **ADAPTAR A LATAM** | Precios en CLP muy por debajo de $299-999; cobro vía MercadoPago/Flow (docs existentes), no Whop |
| 9 | Bifurcación de signup Brands/Agencies/Creators | /plans | **ADAPTAR A LATAM** | Octopus ya bifurca creator/company; considerar agencias más adelante (SideShift Discover valida el vertical) |
| 10 | Tabla comparativa vs DIY vs agencia + 4 stats + testimonios con nombre/cargo | Homepage | **ADAPTAR A LATAM** | Reemplazar Venmo→transferencia, iMessage→WhatsApp; testimonios de creadores chilenos con cifras en CLP |
| 11 | W9/1099 automáticos | /platform/payments | **ADAPTAR A LATAM** | Equivalente chileno: boleta de honorarios / SII automatizado — diferenciador local enorme |
| 12 | Verificación TikTok pegando código en el perfil | Reviews may 2026 | **MEJORAR (queja documentada)** | Octopus ya tiene OAuth TikTok en frontend/app/api — verificación real automática, sin fricción |
| 13 | Pagos: promesa 3 días vs realidad >1 semana; ToS que no garantiza pago; video borrado = pago perdido | ToS, Trustpilot, reviews | **MEJORAR (queja documentada)** | Escrow/garantía de pago si la campaña se cancela a mitad + SLA visible; es SU mayor fuente de quejas |
| 14 | Paywall Pro en el signup (~$10) antes de mostrar valor | Reviews jun 2026 | **MEJORAR (queja documentada)** | Freemium con cap de aplicaciones sí; suscripción solo después del primer apply/primera plata |
| 15 | Remoción de creadores de campañas sin explicación; campañas que desaparecen | Trustpilot, reviews | **MEJORAR (queja documentada)** | Razones visibles obligatorias + pago proporcional del trabajo aprobado |
| 16 | Soporte que tarda días; imposible borrar cuenta | Trustpilot | **MEJORAR (queja documentada)** | Soporte <24h (ya hay chatbot Gemini) + borrado de cuenta self-serve |
| 17 | Sin verificación de views por API; bonos opacos con umbrales lentos | /creators FAQ, reviews | **MEJORAR** | Rewards CPM público y transparente (estilo Content Rewards/Whop) verificado por OAuth — SideShift no lo tiene |
| 18 | Sin Android; iOS 18.6+ únicamente | Google Play, ficha | **MEJORAR** | Web app mobile-first (Octopus ya es Next.js) + PWA/Android: en LATAM Android es ~80%+ del mercado |
| 19 | Sin integraciones e-commerce (Shopify/TikTok Shop/tracking links/códigos) | blog tiktok-shop, búsquedas | **MEJORAR (gap confirmado)** | Tracking links + códigos de descuento desde el día uno = atribución de ventas que SideShift no ofrece |
| 20 | Red de creadores solo US/UK/CA/AU | /platform/influencer-database, hyred | **MEJORAR** | El hueco entero de Octopus: creadores Chile/LATAM con payout local |
| 21 | Communities + chat nuevo + llamadas in-app (v2.12-2.14) | Version history | **ADAPTAR / POSTERGAR** | Valioso pero no MVP; en Chile la comunidad puede vivir en WhatsApp al inicio |
| 22 | Portfolio compartible público (v2.11) | Version history | **COPIAR IGUAL** (fase 2) | Barato con perfiles públicos Next.js; además es growth loop |
| 23 | SideShift Discover (agencias/clippers) | Su LinkedIn | **DESCARTAR por ahora** | Vertical de escala; sin masa crítica no aplica |
| 24 | Categorías campus jobs / event staff / internships | App Store | **DESCARTAR** | Restos del pivot V1; diluyen el posicionamiento UGC |
| 25 | IAP "Premium" $0.99 duplicado + "Pro Membership" $249.99 | Ficha App Store | **DESCARTAR** | Escalera de precios confusa; con Pro mensual/anual basta |
| 26 | Pedir review de App Store al abrir la app + ubicación obligatoria en signup | Reviews 2026 | **DESCARTAR** | Fricción documentada sin retorno |
| 27 | Migración destructiva V1→V2 (borró mensajes, jobs y planes pagados) | Reviews feb 2026 | **ANTI-PATRÓN** | Cualquier migración de Octopus debe preservar datos de usuario; SideShift perdió confianza y ratings por esto |

---

## 7. Huecos: qué NO pudimos ver (capturar manualmente con la app instalada)

Los screenshots oficiales son de la V1 muerta y no hay app Android, así que la V2 real solo se conoce por reviews y marketing. El fundador debería instalar "SideShift - Earn Money" (iOS 18.6+, cuenta US si es necesario) y capturar:

1. **Pantallas reales de la V2**: home/feed del creador 2026, tab bar actual (¿cuántos tabs y cuáles?), diseño visual real de la app (solo conocemos el de la web).
2. **Onboarding paso a paso exacto**: orden y texto de las preguntas, la pantalla del "carousel of brands", dónde y cómo aparece exactamente el paywall Pro (~$10), pantallas de verificación email/teléfono/ubicación.
3. **Card de gig y detalle de campaña**: qué campos muestra (pago, tipo, deadline, marca), cómo se ve el one-tap apply y el estado post-aplicación.
4. **Bootcamp/Badges por dentro**: lista de lecciones, mecánica exacta de XP, nombres de los tiers sobre Bronze (Silver/Gold solo implícitos, nunca confirmados), pantalla del leaderboard actual.
5. **Verificación TikTok**: flujo exacto del código a pegar (¿en bio? ¿en un video?), y si en 2.18 ya existe algún OAuth.
6. **Wallet real**: mínimos/máximos de retiro (no publicados), estados del payout, pantalla de invoices a marcas, flujo Whop embebido (KYC) paso a paso.
7. **Communities (v2.14)**: qué son concretamente — ¿grupos por campaña, por nicho, foro general? Cero documentación pública. Ídem el programa **"the circle"** mencionado por un creator en una review (22 jun) — no aparece en ningún material oficial.
8. **Chat y llamadas in-app**: UI, si las llamadas son audio/video, si hay agendamiento de entrevistas automatizado visible.
9. **Portfolio compartible (v2.11)**: cómo se ve la URL pública y qué muestra.
10. **"New premium features" de v2.16-2.17**: nunca especificadas en las release notes — ver qué desbloquea Pro hoy dentro de la app y qué es el IAP "Premium" $0.99.
11. **Dashboard de marca en app.sideshift.app** (requiere trial): formulario real de creación de Job Listing, pantalla de aplicantes, flujo de aprobación de contenido y el dashboard ROAS/CTR/Hook Rate (solo conocemos el marketing). /pricing y /plans/brands renderizan precios por JS — verificar cifras en el checkout real.
12. **Mecánica interna del matching y del tracking de views/conversions**: no documentada públicamente (API vs scraping vs submission de links).

---
*Fuentes principales: App Store id6481115809 + iTunes Lookup/RSS (2 jul 2026), sideshift.app y subpáginas /creators /pricing /plans /platform/* /casestudies /terms-of-service (fetches directos jul 2026), whop.com/blog/sideshift, netinfluencer.com (entrevista Nick Lawton), LinkedIn de SideShift, Trustpilot, hyred.com, contentrewards.com, mwm.ai (screenshots), go.sideshift.app / thankyou.sideshift.app.*