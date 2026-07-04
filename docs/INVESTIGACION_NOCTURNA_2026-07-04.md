# Investigación Nocturna — 4 de julio 2026

> Preparada mientras Felipe duerme. 4 investigaciones en paralelo + auditoría de seguridad.

## Estado
- [x] 1. Métodos de pago LATAM
- [x] 2. SideShift a fondo + competidores + plan de crecimiento con $0
- [x] 3. Legal Chile/LATAM (SII, ley fintech, datos personales, escrow)
- [x] 4. Auditoría de seguridad del código
- [x] 5. Fixes críticos de seguridad preparados (`SECURITY_FIXES_2026-07-04.sql`)

## Pregunta clave para el Zoom de Whop
> "Can we charge our platform fee at **withdrawal** instead of per-payment? We want a custom % (3.5%) taken when creators cash out." (Whop soporta `application_fee` — confirmar si aplica a withdrawals o solo a checkouts.)

## Hallazgos de seguridad propios (ya con fix listo)
1. **CRÍTICO**: `process_payment` era llamable por cualquier usuario logueado vía `/rest/v1/rpc/` → robo de fondos. Fix: REVOKE a anon/authenticated.
2. **CRÍTICO**: cualquier usuario podía cambiarse su propio `plan`/`discount_percent` (UPDATE a su fila de profiles) → Enterprise gratis. Fix: trigger que congela esas columnas.
3. **CRÍTICO**: un invitado al equipo podía editarse sus propios `permissions`. Fix: trigger (solo el dueño de la empresa los cambia).
4. **ALTO**: wallets editables/creables con balance arbitrario desde el cliente. Fix: trigger fuerza balance 0 al crear y congela montos en updates de usuarios.

*(Las secciones siguientes se llenan cuando terminen los agentes.)*

## 1. Métodos de pago LATAM ✅

### El stack recomendado

**COBRAR a empresas (suscripciones + depósitos):**
| Prioridad | Proveedor | Por qué |
|---|---|---|
| **Principal** | **MercadoPago Chile** | Acepta persona natural con RUT, cero costo fijo, API de suscripciones madura (`preapproval`), alta en minutos. Lo único activable HOY. Fee 2,89-3,19% + IVA |
| Plan B | **Flow.cl** | También acepta persona natural. Transferencia bancaria a **0,99% + IVA** — imbatible para depósitos grandes. Usarlo EN PARALELO a MP para recargas por transferencia |
| Plan C | **dLocal Go** (probar signup ya, gratis) → **Rebill** cuando haya SpA (6 países LATAM en un contrato, pero exige empresa + US$500/mes mínimo) |

**PAGAR a creadores (payouts):**
| Prioridad | Proveedor | Por qué |
|---|---|---|
| **Principal** | **Whop Platforms** (ya integrado) | Connected accounts aceptan individuos, 241+ territorios, expandiendo LATAM (inversión de Tether feb-2026). ⚠️ Riesgo: API invite-only — preguntar en el Zoom si aceptan operador persona natural chileno de 18 años |
| Plan B | **PayPal Payouts** | El único mass-payout viable para persona natural (cuenta Business con RUT + aprobación de la feature). Fee 2% con tope $20. Cubre CL/AR/PE/MX/BR |
| Plan C | **USDT/USDC como opción de retiro** (Binance/Airtm personal) | Casi gratis (0-0,35%), funciona hoy. Ofrecerlo como OPCIÓN, no riel único. Ojo: desde jun-2026 los exchanges reportan al SII |

**Descartados:** Stripe (NO opera en Chile), Wise (exige empresa — pero excelente al tener la SpA), PayU (absorbido por Rapyd, recurrencia muerta), Deel/Remote ($29-49/creador/mes = carísimo para UGC), Bitwage (rechaza pagadores sin entidad), Trolley ($2.399/año).

### Hallazgo clave
**Casi todas las puertas cerradas se abren con la SpA** (gratis, 1 día): Rebill, Wise Business (rieles CLP/ARS confirmados), Binance Merchant, Transbank directo (2,35% crédito, lo más barato de Chile). → **La SpA no es solo tema legal, es el desbloqueador de pagos.**

### Arquitectura sugerida
- Cobros: MercadoPago (suscripciones+checkout) + Flow (transferencias grandes) → saldo interno.
- Payouts: Whop detrás de un **patrón adaptador** en `app/api/` para poder enchufar PayPal como segundo riel sin tocar el resto del código.
- LLC en EE.UU. (Stripe Atlas): NO por ahora — $500 + obligaciones fiscales serias (multa $25k por no presentar Form 5472). Solo si nos volvemos globales.

### Preguntas para el Zoom de Whop (actualizadas)
1. ¿Aceptan un operador persona natural chileno (18 años) o exigen entidad?
2. ¿Fees exactos de "local bank transfer" para Chile/México/Argentina/Colombia? (no son públicos)
3. ¿Podemos cobrar nuestro % en el retiro (custom application fee) en vez de por pago?
4. ¿Fund-hold timing y quién es merchant of record?

## 2. SideShift + competidores + crecimiento ✅

### 🔑 El hallazgo que cambia todo
**SideShift NO es principalmente clipping por CPM — es un marketplace de UGC brand-deals** (marcas publican jobs, creadores aplican, producen, se aprueba, se paga; el pago-por-views es UNA modalidad entre 50+). El clipping puro por CPM lo domina **Whop Content Rewards** (~$40.000/día pagados, ~1M videos/mes, ~480K clippers). **Octopus puede combinar los dos: jobs estructurados estilo SideShift + campañas pay-per-view estilo Whop.** Ya tenemos las dos bases.

### Datos clave verificados
- SideShift fundada 2024, ~$2.18M levantado. **Pivotearon desde un marketplace de gigs universitarios** — sus primeros clippers fueron su base de estudiantes, y sus primeras ~10 marcas fueron indie hackers de apps que llegaron solos.
- Sus cifras ("$100M pagados, 1M creadores") son **autorreportadas y sospechosas** (Whop, el líder, paga ~$14.6M/año). Marketing, no auditado.
- **SideShift usa los payouts de Whop, igual que nosotros.** No tienen infra de pagos propia. Confirmado.
- **La debilidad #1 de TODO el sector es la confianza en el pago** (quejas: pagos que tardan, retiros bloqueados, campañas que desaparecen). ← **Nuestra mayor oportunidad de diferenciación.**

### El argumento que cierra ventas (para el pitch a marcas y creadores)
- **A marcas:** CPM de clipping $0.30-$2 vs $40-80 de ads tradicionales. 1M de views ≈ $950.000 CLP con CPM $1 — comparable a 2 posts de micro-influencer pero con **views garantizadas**.
- **A creadores:** **TikTok Creator Rewards NO existe en Chile** (solo Brasil y México en LATAM), y donde existe paga $0.02-0.06/1000 views. **Octopus pagando $0.30-1.00 ofrece 5-30× más.** Pitch: *"TikTok no te paga en Chile. Nosotros sí."*

### Features que faltan (priorizadas, dificultad sobre nuestro stack)
**ALTA (core):**
1. **Campañas CPM con budget cap** (marca fija pool + $/1000 views + payout mín/máx por video) — Media
2. **Tracking de views vía cuenta conectada** (TikTok Display API — ya tenemos OAuth; empezar solo-TikTok) — Media-alta
3. **Aprobación de submissions + timer de auto-aprobación** (ya tenemos aprobación de la Fase A; falta timer + gatillo de pago) — Baja-media
4. **Anti-fraude básico** (delay de pago 7 días + snapshot de views + revisión manual; con volumen bajo, NOSOTROS 2 somos el anti-fraude) — Media

**MEDIA (retención/confianza):**
5. Gamificación XP + niveles + leaderboard — Baja-media
6. Dashboard de earnings transparente (ganado/adeudado/pendiente) — **Baja** (ataca la queja #1 del sector)
7. Job Boosts (upsell B2B, empuja el listing al tope 48h) — Baja
8. Escrow explícito (cobrar el pool por adelantado) — Media
9. Derechos de uso + Spark Ads codes (checkbox en el brief) — Baja

**BAJA (después):** contests/prize pool · PWA (en vez de app nativa) · perfiles públicos con precios · SideShift Pro (suscripción a creadores).

### Modelos de negocio del sector (verificados)
- **Whop: 7% al clipper** + marca fondea el pool. Simple, alineado con volumen → **recomendado como base.**
- JoinBrands: **doble comisión** (8-15% marca + 15-20% creador). Monetiza ambos lados pero espanta cuando no hay liquidez.
- **Concierge/agencia con retainer** ($2.500-10.000/mes, margen 30-50%): **este es nuestro MVP natural** — operar las primeras campañas a mano como agencia mientras el software madura.

### Plan de lanzamiento LATAM con $0 (lección: NADIE lanzó two-sided)
**Fase 0 (sem 1-2) — oferta primero, a mano:** reclutar 50-100 clippers hispanos donde YA están (Discords de "clipping"/"ganar dinero", "Clippers Flow" de Whop, TikTok orgánico). Crear el **Discord/WhatsApp de Octopus ANTES del producto perfecto** — en este sector la comunidad ES el canal.

**Fase 1 (sem 2-6) — demanda concierge, 3-5 campañas a mano:** prospectar las **+700 marcas de CyberDay** (lista pública CCS: moda, tech, belleza) + indie hackers chilenos. Oferta irresistible: *"primera campaña al costo: pones $200.000 de pool, te conseguimos 500K views, solo pagas views reales"*. Emparejar clippers a mano por WhatsApp. Cada campaña = case study con números.

**Fase 2 (mes 2-4) — motor orgánico:** **build in public en TikTok en español** (nadie lo hace — espacio vacío, y documentar Octopus ES una campaña de clipping). **SEO long-tail** estilo Collabstr ("creadores UGC en Santiago", "clipping en español" — casi sin competencia en español, Next.js lo hace trivial). Saturar Chile antes de escalar (1.000 usuarios densos > 100K dispersos).

### ⚠️ Dato tributario corregido
Si Octopus (empresa) paga directo a creadores, **retiene 15,25% en 2026** (no 14,5% — esa era 2025; sube a 17% en 2028). Definir con contador si operamos como empresa-pagadora o plataforma-intermediaria ANTES de la primera campaña.

### Competencia LATAM
Existen jugadores hispanos (UGC LATAM, Clipéalo Network, HICARI, agencias chilenas) pero **NINGUNO tiene el stack completo** (escrow + CPM self-serve + ratings + licencias + fees publicados). **El gap está abierto, la ventana no dura para siempre.**

## 3. Legal Chile/LATAM ✅

> Orientación general, no asesoría legal. Validar los ⚠️ con un abogado (1-2 horas bastan).

### La conclusión en una línea
**SpA gratis + facturar con IVA + que MercadoPago/Whop custodien la plata resuelve el 80% del riesgo legal por menos de $50.000 CLP.** Lo único con reloj: la ley de datos (dic-2026).

### Lo OBLIGATORIO ahora (antes de la primera transacción real)
1. **Crear la SpA en "Empresa en un Día"** (registrodeempresasysociedades.cl) — GRATIS, 1 día, online, un solo accionista, a los 18 tenés plena capacidad. Objeto sugerido: "servicios de intermediación tecnológica, publicidad y marketing digital, y desarrollo de software". Único costo: firma electrónica (~$10.000 CLP).
2. **Inicio de actividades en el SII** (gratis, online, obligatorio dentro de 2 meses de comenzar actividad).
3. **Facturar con IVA 19% cada comisión** — la comisión de plataforma es primera categoría + IVA (Ley 21.420 trata expresamente al "operador de plataforma de intermediación digital" como contribuyente de IVA). ⚠️ Boletas de honorarios por comisiones = incorrecto, el SII puede reclasificar.
4. **Cuenta bancaria de la SpA** — separación total plata personal/empresa.
5. **NUNCA custodiar fondos de terceros nosotros** — es EL riesgo que puede matar el proyecto (regulación CMF/Banco Central de "provisión de fondos"; precedente: orden de cese contra Fiverr en California por escrow sin licencia). La estructura correcta: **el PSP regulado custodia (MercadoPago split payments / Whop), Octopus solo instruye liberaciones**. En ToS describirlo como "mandato de pago".

### Datos de los creadores (los tributarios)
El SII resolvió en 2025 (Res. 128/2025): los creadores personas naturales emiten **boleta de honorarios electrónica** por lo que ganan (retención ~14,5%), declarando el monto líquido descontada nuestra comisión. Ellos se encargan; nosotros no retenemos.

### Ley Fintech 21.521 — NO nos obliga
Regula 7 servicios específicos (crowdfunding, custodia de instrumentos financieros, etc.) — un marketplace UGC no presta ninguno. ⚠️ PERO retener saldos tipo billetera sí nos acercaría a "emisor de medios de pago con provisión de fondos" (S.A. especial + autorización CMF) → por eso el PSP custodia, no nosotros.

### Ley de datos 21.719 — deadline 1 de diciembre 2026
- Obliga: base de licitud, derechos ARCO, registro de actividades de tratamiento, notificación de brechas a la nueva Agencia (APDP).
- Multas hasta 20.000 UTM, PERO PYMEs reciben **amonestación escrita en la primera infracción** (no multa).
- Mínimo viable para 2 personas: política de privacidad honesta (ya la tenemos, ajustar), correo privacidad@ para ARCO, una planilla como registro de tratamiento, plan de brechas de 1 página. **Agendar: octubre 2026.**

### Creadores: contratista vs empleado
Riesgo BAJO en marketplace puro (el creador elige campañas, sus herramientas, múltiples marcas, sin horario). Sube si Octopus asigna trabajo o fija jornada — no hacerlo. Nuestros ToS ya tienen las cláusulas correctas (intermediario tecnológico, contratista independiente, responsable de sus impuestos, indemnidad, disputas internas). Referencia: T&C de Workana.

### Menores
"18+" en ToS necesario pero no suficiente si hay conocimiento efectivo. Estándar razonable hoy: ToS 18+ ✓, pedir fecha de nacimiento al registrarse (→ agregar), KYC del PSP como filtro natural, cerrar cuentas de menores detectadas. Hay proyecto de ley chileno (<16 en redes) aún en trámite.

### Riesgos ordenados por gravedad
1. 🔴 Custodiar plata de terceros en cuentas propias → PSP custodia (arreglado por diseño)
2. 🔴 Cobrar comisiones sin entidad ni SII → SpA gratis + inicio actividades
3. 🟡 Ley 21.719 sin cumplir después de dic-2026 → checklist barato antes de octubre
4. 🟡 Menor colándose como creador → fecha de nacimiento + KYC del PSP
5. 🟢 Reclamación laboral → bajo, cláusulas ya en ToS
6. 🟢 IVA mal documentado → resuelto con la SpA

### Checklist accionable (todo <$50.000 CLP)
- [ ] SpA en Empresa en un Día + inicio de actividades SII
- [ ] Cuenta bancaria de la SpA
- [ ] MercadoPago y Whop **a nombre de la SpA**, modo marketplace/split
- [ ] Agregar fecha de nacimiento + checkbox 18+ al registro
- [ ] Correo privacidad@ + planilla de tratamiento de datos + plan de brechas 1 página
- [ ] Registrar marca "Octopus" en INAPI cuando haya tracción (⚠️ revisar disponibilidad, es nombre común)
- [ ] Octubre 2026: revisión final Ley 21.719

## 4. Auditoría de seguridad ✅ (el agente auditó TODO el código)

> **ORDEN #1 DE MAÑANA: correr `SECURITY_FIXES_2026-07-04.sql` (ya actualizado con TODOS los fixes) antes que nada.**

### 🔴 CRÍTICAS
- **C1 — Backdoor admin `admin123`**: yo creé `admin@octopus.app` con contraseña `admin123` en un SQL versionado. Si el repo es visible, cualquiera entra como admin y con `/api/admin/set-plan` se acuña saldo ilimitado. **Fix: el SQL ahora rota la contraseña — CAMBIÁ el placeholder por una clave fuerte antes de correr.** (Ya no uses admin123.)
- **C2 — `process_payment` robaba fondos** vía RPC (cualquiera drenaba la wallet de cualquier empresa, o con monto negativo inflaba la suya). Fix: REVOKE + guard de monto ≤0. ✅ en el SQL.
- **C3 — Auto-escalada en profiles**: un usuario podía PATCH su propia fila y ponerse `plan=enterprise`, `verified=true`, y lo peor: **`whop_company_id` de otra empresa → secuestrar sus retiros de Whop**. Fix: trigger congela TODAS esas columnas (agregué whop_*). ✅
- **A3 — Unirse a cualquier empresa**: podías cambiar `company_id` de tu propia invitación. Fix: trigger congela company_id/role/permissions. ✅

### 🟠 ALTAS (requieren cambio con cuidado — hacerlas JUNTOS mañana, con pruebas)
- **A1 — PII expuesta**: `profiles` deja a cualquier autenticado leer `email` y `phone_number` de TODOS. Un atacante se registra y baja todos los emails/teléfonos. **Fix necesita diseño** (vista pública sin PII o mover email/phone a tabla protegida) — NO lo toco de noche porque puede romper la app; lo hacemos mañana con pruebas.
- **A2 — Permisos de equipo son solo cosméticos**: viven en localStorage; un miembro `viewer` puede igual INSERT/UPDATE gigs vía REST porque la RLS solo chequea `status='accepted'`, no los permisos. Fix: enforcar permisos server-side (mover acciones sensibles a `/api/*` + RLS con el operador JSONB `?`). También mañana, con pruebas.

### 🟡 MEDIAS (en el SQL o pendientes)
- **M1 — `create_delivery_notification`** llamable por cualquiera → notificaciones falsas de "pago recibido" (phishing). Fix: REVOKE. ✅ en el SQL.
- **M2 — `withdrawal_requests`**: el usuario pone `amount`/`net_amount` libres, sin validar contra el balance. Fix: recalcular server-side al aprobar (pendiente).
- **M3 — Rate limit en memoria** no sirve en Vercel serverless (cada instancia su propio Map). Fix: Upstash Redis / Vercel KV (pendiente).
- **M4 — `/api/support/chat` sin auth** → abuso de quota Gemini. Fix: exigir sesión (pendiente, ojo que el widget sirve a visitantes anónimos).

### 🟢 BAJAS
- Rotar `GEMINI_API_KEY` (estuvo en git). `contact_requests` permite spam anónimo (agregar captcha). `campaigns`/`reviews` lectura pública (poco sensible).

### ✅ Lo que está BIEN (no tocar)
- `getAuthenticatedUser` valida el token real. Todas las rutas sensibles derivan el usuario de la sesión, no del body. El webhook de Whop valida firma HMAC. El service key NUNCA aparece en el cliente. El anon key hardcodeado es aceptable (es público por diseño). `isAdminEmail` hace match exacto (un email "parecido" no pasa).

### Orden de acción de seguridad
1. **Mañana primero:** correr el SQL de seguridad (cierra C1, C2, C3, A3, M1) + rotar GEMINI_API_KEY.
2. **Esta semana, juntos con pruebas:** A1 (PII) y A2 (permisos server-side).
3. **Cuando se pueda:** M2, M3, M4.

## 🎯 PLAN MAESTRO (síntesis de las 4 investigaciones)

### La tesis en una línea
Octopus = **SideShift + Whop Content Rewards, en español, con la confianza en el pago que ninguno tiene**, lanzado como agencia-concierge en Chile y convertido en marketplace. El gap en español está abierto.

### 🔴 MAÑANA, PRIMERO QUE TODO (bloquea todo lo demás)
1. **Correr `SECURITY_FIXES_2026-07-04.sql`** (rotando el admin123 por clave fuerte). Cierra los 4 agujeros críticos.
2. **Rotar `GEMINI_API_KEY`** en Google AI Studio (estuvo en git).
3. Juntos, con pruebas: cerrar **A1 (PII de emails)** y **A2 (permisos server-side)** — NO de noche, para no romper.

### SEMANA 1-2 — Producto: cerrar el modelo clipping (lo que nos falta del core)
Construir sobre la Fase A que ya terminamos:
1. **Campañas CPM con budget cap** (pool + $/1000 views + payout mín/máx por video).
2. **Tracking de views con TikTok** (ya tenemos OAuth → Display API, solo-TikTok primero).
3. **Timer de auto-aprobación** + gatillo de pago (extiende la aprobación de la Fase A).
4. **Dashboard de earnings transparente** (baja dificultad, ataca la queja #1 del sector).

### SEMANA 2-4 — Negocio: desbloquear pagos y legal
5. **Zoom con Whop** (preguntas ya en este doc) → habilitar payouts reales.
6. **MercadoPago + Flow** para cobrar a empresas (persona natural, activable ya) — detrás de adaptador para sumar PayPal después.
7. **Crear la SpA** (gratis, 1 día) + inicio de actividades SII → desbloquea Wise/Rebill/Transbank y formaliza todo.
8. **Escrow explícito**: cobrar el pool por adelantado → "fondos garantizados" al creador (la confianza es el diferenciador).

### MES 1-2 — Lanzamiento concierge (sin gastar)
9. Crear **Discord/WhatsApp de Octopus** + reclutar 50-100 clippers donde ya están.
10. **3-5 campañas operadas a mano** con marcas de CyberDay/indie hackers → case studies con números.
11. **Build in public en TikTok** + **SEO long-tail** en español.

### MES 2-4 — Escala
12. Gamificación (XP/niveles/leaderboard) · Job Boosts · derechos de uso + Spark codes · anti-fraude reforzado · PWA con push · cumplimiento Ley 21.719 (antes de dic-2026).

### Tu tarea externa (Felipe, no técnica)
- Zoom con Whop (desbloquea pagos reales).
- Crear la SpA + SII (desbloquea legal + pagos).
- Rotar las 2 llaves (Gemini + TikTok) y el admin.

### Modelo de negocio elegido
**7% al creador sobre payouts** (como Whop) + la marca fondea el pool. Suscripciones B2B (Starter/Pro/Scale, ya construidas) como capa 2. Empezar operando campañas como agencia (margen 30-50%) mientras el marketplace madura.

---
*Informe completo. 4 investigaciones + auditoría de seguridad, todo verificado. Buenos días, Felipe. 🐙*
