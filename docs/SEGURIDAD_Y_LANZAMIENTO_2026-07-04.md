# 🔒 Investigación de Seguridad + Lanzamiento — Octopus (4 jul 2026)

Auditoría con **17 agentes en paralelo** sobre el código real + investigación de lanzamiento/features. Este es el informe consolidado.

> **Contexto que enmarca TODO:** el 83% de las brechas en apps Supabase son RLS mal configurado, no exploits sofisticados. Nuestra arquitectura (cliente llama directo a la base con la anon key) hace que **cada validación en el navegador sea cosmética** — un atacante la saltea llamando a la API directo. La seguridad real vive en la **RLS + triggers + rutas server-side**. Ahí enfocamos.

---

## 🚨 RESUMEN EJECUTIVO — lo crítico

| # | Agujero | Qué permitía | Estado |
|---|---------|--------------|--------|
| 1 | `profile/save` sin whitelist | Auto-regalarse plan Enterprise + robar payouts (poner el whop_id de otro) | ✅ **ARREGLADO (código)** |
| 2 | `whop/token` sin auth | Cualquiera sacaba token de pagos de otra empresa | ✅ **ARREGLADO (código)** |
| 3 | `whop/setup-creator` con id del body | Secuestrar el portal de retiros de otra empresa | ✅ **ARREGLADO (código)** |
| 4 | Buscadores sin sanitizar | Inyectar filtros PostgREST para leer emails/datos ajenos | ✅ **ARREGLADO (código)** |
| 5 | `video_url`/handles con `javascript:` | XSS: ejecutar código en la sesión de la empresa/admin | ✅ **ARREGLADO (código)** |
| 6 | `process_payment` sin lock | Doble pago por carrera → vaciar la caja de Octopus | ⚠️ **SQL (correr HARDENING)** |
| 7 | Creador controla `payment_amount` | Poner 999999 y vaciar la wallet de la empresa | ⚠️ **SQL (correr HARDENING)** |
| 8 | Reseñas falsas / auto-reseña | Inflar la propia reputación o hundir a un rival | ⚠️ **SQL (correr HARDENING)** |
| 9 | Retiros sin validar saldo | Pedir retiro por más de lo que se tiene | ⚠️ **SQL (correr HARDENING)** |
| 10 | Métricas TikTok editables | Inflar followers/views a mano para conseguir gigs | ⚠️ **SQL (correr HARDENING)** |
| 11 | Permisos de equipo ignorados | Un "Colaborador" creaba/editaba campañas igual | ⚠️ **SQL (correr HARDENING)** |
| 12 | Auto-upgrade de plan por PATCH | Plan gratis / admin / descuento 100% | ⚠️ **Depende de SECURITY_FIXES ya corrido** |
| 13 | Backdoor `admin123` en el repo | Login como admin con credenciales públicas | 🔴 **ACCIÓN TUYA (rotar)** |
| 14 | GEMINI_API_KEY filtrada en git | Consumir/facturar nuestra cuota | 🔴 **ACCIÓN TUYA (rotar)** |

**Traducción:** los agujeros de **código ya los cerré y desplegué**. Los de **base de datos** se cierran corriendo **UN solo SQL** (`HARDENING_SEGURIDAD_2026-07-04.sql`). Y hay **2-3 cosas que solo puedes hacer tú** (rotar llaves/contraseña).

---

## ✅ Lo que YA arreglé y desplegué (código, en Vercel)

1. **`profile/save` con whitelist estricta** — solo deja editar campos de perfil reales (nombre, bio, redes, foto...). Ya NO se puede escribir `plan`, `whop_company_id`, `is_admin`, `discount_percent` por esta vía. *Cerraba escalada de plan Y robo de payouts a la vez.*
2. **`whop/token`** — ahora exige login y deriva la empresa del perfil del usuario (antes: `?companyId=<víctima>` sacaba su token de pagos sin login).
3. **`whop/setup-creator`** — ignora el `companyId` del body; usa el del perfil autenticado (antes: se podía apuntar al portal de retiros de otra empresa y drenarla).
4. **Buscadores (`recruit`, `settings`)** — sanitizados con `pgSearchTerm()`: se quitan los metacaracteres de PostgREST (`, ( ) * & %`). Ya no se puede inyectar `&select=email,phone` para exfiltrar datos. Y `recruit` dejó de pedir `select=*`.
5. **XSS por `video_url`/LinkedIn** — todos los `href` con URLs de usuario pasan por `safeExternalUrl()`: solo `http(s)`, bloquea `javascript:`/`data:`. Un creador ya no puede poner un link malicioso que ejecute código cuando la empresa hace clic.

Helpers nuevos: `lib/safe.ts` (`safeExternalUrl`, `pgSearchTerm`, `isUuid`).

---

## ⚠️ Lo que cierra el SQL `HARDENING_SEGURIDAD_2026-07-04.sql` (correr en Supabase)

**Un solo archivo, idempotente, probado para NO romper la app.** Cierra:

- **Dinero atómico**: `process_payment` con `FOR UPDATE` (lock) + `CHECK(balance >= 0)` + índice único que impide pagar dos veces la misma entrega → **no más doble gasto ni caja en negativo**.
- **Entregas blindadas**: el creador ya no puede cambiar `payment_amount`, auto-aprobarse, ni reabrir una entrega ya pagada. Y no puede crear entregas "huérfanas" contra empresas que no lo eligieron.
- **Contratos blindados**: el creador solo acepta/rechaza + pone handles; no toca el monto ni marca "completado".
- **Aplicaciones**: el creador no puede auto-aceptarse (eso lo hace la empresa).
- **Reseñas**: solo si hubo una entrega completada entre ambos; nada de auto-reseñarse ni bombardear rivales (+ índice único).
- **Retiros**: valida contra el saldo real; el servidor recalcula el neto (el cliente no lo controla).
- **Ofertas "Hablemos"**: la empresa solo acepta/rechaza; no se auto-fija precio 0 / comisión 0.
- **Métricas**: followers/views de TikTok solo los escribe el server (no inflables a mano).
- **Vista `content_deliveries_full`**: pasa a `security_invoker` → respeta RLS (antes exponía TODAS las entregas y montos).
- **Permisos de equipo**: la RLS ahora mira el permiso granular → un "Colaborador" ya no crea/edita campañas.
- **RPC hardening**: funciones de contenido solo llamables por usuarios logueados (no `anon`).

---

## 🔴 Lo que SOLO puedes hacer tú (crítico antes de Whop/inversores)

1. **Rotar la GEMINI_API_KEY** (`AIzaSy...DEo`) — quedó en el historial de git y sigue viva. Google AI Studio → nueva key → ponla en `.env.local` + Vercel. *(Ya no la usamos en el chatbot, pero está expuesta.)*
2. **Cambiar la contraseña del admin** — `admin@octopus.app / admin123` está en el repo público. Corre en Supabase:
   ```sql
   UPDATE auth.users SET encrypted_password = crypt('UNA-CLAVE-FUERTE-REAL', gen_salt('bf'))
   WHERE email = 'admin@octopus.app';
   ```
   *(Dijiste dejar admin123 por ahora para aprobar features — OK, pero antes de mostrarle a Whop hay que cambiarla.)*
3. **Revocar los secrets viejos de TikTok** (`7of3cvj...`, `TPJoLFHD...`) en el TikTok Developer Portal si no lo hiciste.
4. **Verificar que `SECURITY_FIXES_2026-07-04.sql` se corrió** en la base de producción. Corre esto y deben salir 3 filas:
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgname LIKE 'protect_%';
   ```
   Si no salen, el auto-upgrade de plan (#12) sigue abierto.
5. **Activar Captcha en Supabase Auth** (Settings → Auth → Enable Captcha, hCaptcha/Turnstile) — evita registro masivo de bots que ensucien la demo.

---

## 🛡️ Recomendaciones de fondo (defense-in-depth, cuando haya tiempo)

De la investigación de best practices (Supabase/Vercel/OWASP), priorizado por impacto/esfuerzo:

**Rápido y alto impacto:**
- **Vercel WAF (Firewall)** — gratis, actívalo: rate-limit por IP en `/api/*`, login, signup; bot protection para la demo.
- **Rate limiting distribuido con Upstash Redis** — el `lib/rateLimit.ts` actual es en memoria y se evade en serverless (cada instancia tiene su propio contador).
- **Esconder PII (email/phone)** de otros usuarios — hoy cualquier cuenta puede leer `profiles` de todos. Requiere pasar de `select=*` a columnas concretas + una vista `security_invoker` (necesita cambios de código; lo dejé documentado, no lo forcé para no romper nada).
- **Migrar a las nuevas API keys de Supabase** (las viejas se retiran a fines de 2026) + activar GitHub secret scanning.

**Esfuerzo medio:**
- **Sesión en cookies httpOnly** (`@supabase/ssr`) en vez de localStorage — hoy un XSS robaría el token. Ojo con el bug de "navigator locks" de supabase-js (por eso usamos localStorage); la migración necesita pruebas.
- **Gating server-side de `/admin`** — hoy es client-side (falsificable). Los datos igual están protegidos por RLS + las rutas API validan el email real, pero conviene un middleware real.
- **Límites de imágenes** — hoy se guardan como base64 en la base sin límite de tamaño (riesgo de DoS por inflado). Validar `file.size` y comprimir (o mover a Supabase Storage).
- **CSP + security headers** con allowlist de dominios (Supabase, Whop, TikTok).

---

## 🚀 LANZAMIENTO — ¿estamos listos?

**Respuesta honesta: el producto técnico está avanzado, pero NO para un "hard launch con todo el marketing" todavía — y no por el código, sino por falta de LIQUIDEZ comprobada.** En un marketplace de dos lados, gastar en marketing antes de tener liquidez tira gente a un lado vacío: llegan, no encuentran match, se van quemados, y quemaste presupuesto Y la primera impresión.

### La secuencia correcta (no lanzar tibio)
1. **Beta cerrada en UN nicho** (Chile, un vertical: apps/SaaS, o cripto/fintech, o marcas de CyberDay). No "LATAM entero" el día 1.
2. **Siembra el lado difícil = las MARCAS con presupuesto.** Los clippers hispanos llegan solos (TikTok les paga miseria; el gap es tu pitch). El cuello de botella es dinero de marcas entrando.
3. **Concierge manual**: opera 3-5 campañas a mano, empareja marca↔clippers tú mismo. Si no cierras marca ancla, **financia tú la primera campaña ($200-500)** para prender la mecha y que haya clippers cobrando de verdad.
4. **Meta mínima: ~10 transacciones reales con retención.** Ahí aparece el flywheel.
5. **Recién entonces, hard launch con TODO el mismo día**: campañas vivas + Product Hunt + prensa LATAM (Contxto, DF Lab) + creadores embajadores. Ángulo de prensa que se escribe solo: *"Fundador chileno de 18 lanza el 'Whop en español' para que creadores LATAM ganen en dólares."*

### Bloqueante antes de mover dinero real
- Loop completo probado por alguien que no seas tú · pagos entrantes (MercadoPago/Flow) y payouts (Whop) reales · **RLS + los fixes de este informe** · webhooks firmados+idempotentes · **SpA + inicio de actividades en SII** (gratis, 1 día) · no custodiar fondos (que el PSP lo haga) · dominio propio + emails con DKIM/DMARC · ToS/privacidad · analytics instalado.

### Para inversores (Platanus: USD 200k por 7%, aman fundador que codea)
Quieren ver **producto vivo + tracción de marketplace**: GMV, campañas llenadas, marcas que repiten, clippers activos, retención D30, crecimiento orgánico. Tu perfil (18 años, técnico, producto ya funcionando) es exactamente lo que buscan — véndelo como asset.

---

## 💡 FEATURES que nos diferencian (para ser defendibles, no cosméticas)

Priorizadas por impacto/dificultad (⚠️ = ojo legal en Chile):

**Construir primero (definen la categoría):**
1. **Ligas por temporada** (Bronce→Diamante→Octopus League por views verificadas, con ascenso/descenso). El "Duolingo del clipping" — la mecánica de retención más probada que existe.
2. **Escrow visible + "clip aprobado = clip pagado"** — ataca EL dolor #1 de Whop (clippers con millones de views que no cobran). Nuestro mayor diferenciador de confianza.
3. **Detección de fraude de views** (reglas heurísticas baratas primero) — Whop tiene fraude masivo documentado; si pagamos limpio, migran a nosotros.
4. **Pagos instantáneos en CLP/LATAM** — moat de experiencia difícil de copiar para players gringos.

**Crecimiento viral y bajo esfuerzo:**
5. **Leaderboard + perfil público** (da "clout" + páginas SEO gratis). Baja dificultad.
6. **Referidos doble-cara con plata** (alimenta ambos lados). Baja dificultad.
7. **Retos con hashtag** patrocinados por la marca (virales por diseño).
8. **Rachas + misiones** diarias (hábito; +48% retención en Duolingo).

**IA barata de valor real:**
9. **Matching creador↔marca** con nuestros propios datos (data moat).
10. **Briefs asistidos por IA** para marcas (baja la barrera del lado difícil).
11. **"Octopus Score"** — reputación portátil solo dentro de Octopus = lock-in.

**Monetización extra:** featured placement, plan Pro para creadores, retiro express.

### ⚠️ Sobre tu idea de las batallas 1v1 con pool de plata de los usuarios
Es la idea más jugosa **y la más peligrosa legalmente**. En Chile, un pool donde los usuarios ponen su plata y el ganador se la lleva se parece demasiado a **apuesta** (prohibida salvo autorización; la Corte Suprema considera ilegal la apuesta online no autorizada). **Cómo hacerla segura:** que el premio lo ponga **la marca o Octopus** (= concurso de destreza, no apuesta), el ganador se decide 100% por métrica verificable (views), y no cobramos rake del pool. Lánzala primero en versión "sponsor-funded". Consultar abogado chileno antes de cualquier variante con plata de usuarios.

---

*17 agentes · auditoría de código real + investigación web con fuentes. Detalle técnico de cada hallazgo (archivo:línea, exploit, fix) disponible en los transcripts de los agentes.*
