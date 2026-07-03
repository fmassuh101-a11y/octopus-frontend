# Informe Nocturno: Verificación, APIs, anti-fraude y SideShift a fondo

## 1. Verificación de cuentas por código-en-bio

**Cómo lo hace Whop (flujo operativo exacto):** El creador entra a Explore > Content Rewards, elige campaña, pero antes de enviar contenido debe CONECTAR/VERIFICAR cada cuenta social por separado (TikTok, IG, YouTube). El flujo de propiedad es: (1) Whop genera un código único en el dashboard; (2) el creador lo pega en la BIO del perfil; (3) pulsa "Verify" y Whop lee la bio del perfil público; (4) confirmada la propiedad, el código puede quitarse. El error #1 reportado es "Verification code was not found in bio" (por no guardar cambios, caché del perfil, o pegar mal el código). Fuente: docs.whop.com/memberships-and-access/third-party-apps/content-rewards; tiktok.com/discover/what-if-the-verification-code-was-not-found-in-bio-whop-app.

**Whop separa DOS verificaciones distintas:** (a) propiedad de cuenta social vía código-en-bio (rápida, sin documentos); (b) "Whop Verified"/KYC de identidad para PAGOS/payouts (proceso separado, más pesado). Existe endpoint formal "Verification" en su API. Fuente: docs.whop.com/api-reference/verifications/verification; whop.com/blog/everything-you-need-to-know-about-whop-verified.

**El código-en-bio es el estándar de facto del clipping.** reach.cat da código alfanumérico único → el clipper lo añade a la bio → pulsa verify → lo quita después. Lo venden explícitamente como ventaja sobre Whop: "Whop requiere KYC completo; nosotros verificamos por código en <5 minutos". Flujo del sector: registro → verificar cuentas vía bio code → navegar campañas → clipear → enviar la URL del post para tracking. El tracking real va por la URL, no por el código (el código solo prueba propiedad una vez). Fuente: reach.cat/blog/how-to-make-money-clipping; clipping.net/policies/clipper-terms-and-conditions.

**Cómo leer la bio técnicamente — veredicto por plataforma:**

- **YouTube (fácil, legítimo, primero a implementar):** YouTube Data API v3 devuelve la descripción pública del canal (snippet: title, description, customUrl) usando solo una API KEY, SIN OAuth. Buscas el código en el texto. Sin scraping, sin proxies. Fuente: developers.google.com/youtube/v3/docs/channels.
- **TikTok (redundante si hay OAuth):** La API oficial (Display API user/info) devuelve bio_description, username, is_verified, follower_count, PERO requiere OAuth del propio usuario; NO puede consultar perfiles arbitrarios por username. Como Octopus ya tiene OAuth de TikTok en el repo, si el creador autoriza obtienes su bio directo y el código-en-bio es innecesario. El código+scraping solo tiene sentido si NO fuerzas OAuth. Fuente: developers.tiktok.com/doc/tiktok-api-v2-get-user-info.
- **Instagram (el caso más difícil):** Instagram Basic Display API se apagó permanentemente el 4-dic-2024; ya no soporta cuentas personales. Leer la bio de una cuenta personal requiere scraping frágil (IG bloquea IPs datacenter al primer request, TLS-fingerprint, doc_id de GraphQL que rota cada 2-4 semanas) o forzar OAuth Creator/Business. Fuente: getphyllo.com/post/instagram-basic-display-api-deprecation; scrapfly.io/blog/posts/how-to-scrape-instagram.

**Costos de scraping (cuando aplica):** Apify TikTok scraper (clockworks/tiktok-scraper, xtdata) extrae bio, followers, verificación en JSON sin login, desde ~$1 por 1.000 resultados (algunos actores ~$0.002/request); requiere proxies residenciales (~$8/GB en Apify pay-as-you-go, porque TikTok bloquea datacenter). Para IG: ScrapingBee (~99.65% éxito en pruebas 2025; modelo de créditos: 1 HTML básico, 5 con JS, 10-75 dominios premium), Apify Profile Lookup, Bright Data. Marco legal favorable a scraping público logged-out: hiQ v. LinkedIn, Meta v. Bright Data (2024). Fuente: apify.com/pricing; brightdata.com/blog/web-data/best-instagram-scrapers.

**Re-verificación (idea clave que el código de un solo uso NO cubre):** Los bots de Discord (RoleLogic, Social Verify) favorecen OAuth/Connections nativas (cero fricción) y hacen re-chequeo DIARIO que detecta cambios de nombre o desconexión. El código-en-bio prueba propiedad en UN momento, no de forma continua. Fuente: social-verify.vercel.app; rolelogic.faizo.net/integrations/tiktok-creator-role.

## 2. Anti-bots y score de autenticidad

**Vector de fraude #1 a documentar — "verify-then-swap":** verificar con cuenta legítima y luego cambiar la cuenta o su contenido. También: suplantación con cuentas robadas/contenido IA, y poner el código temporalmente sin controlar la cuenta de forma persistente. Mitigaciones del sector: verificación en capas (email+teléfono, device-proofing, challenges escalonados), re-verificación periódica, y OAuth para acciones de alto valor. Fuente: digitalforensics.com/blog/extortion/account-verification-doesnt-stop-scammers; datadome.co/guides/credential/new-account-fraud-prevention-7-strategies.

**Señales concretas a computar (con umbrales y precisión conocida):**
- **Calidad de comentarios (mayor precisión: 87,3%):** flag si >15% de comentarios visibles son de una palabra, solo-emoji o copy-paste. Fuente: influenceflow.io/resources/red-flags-guide-for-influencer-verification.
- **Growth anómalo:** spike >10.000 followers en 24-48h o >15% en 7 días sin viral/prensa (creadores reales crecen 3-8% mensual).
- **Engagement velocity:** el genuino sube gradual en 24-48h con decaimiento natural; el de pods explota en las primeras 2h y cae.
- **Quick Check de 3 indicadores** (calidad comentarios + anomalía ER + growth): si los 3 saltan, la cuenta es fraudulenta el 93% de las veces. Es el algoritmo mínimo viable de alto valor. Fuente: influenceflow.io/resources/influencer-fraud-detection-best-practices.

**Engagement rate robusto (fórmula lista para implementar — Modash):** usar la MEDIANA (no el promedio) de engagements de ~2 meses para filtrar picos virales. TikTok: mediana engagements / mediana views × 100. Benchmarks TikTok: <10K followers >10% fuerte, >15% excelente; mid/large >7% sólido. Instagram: <5K >3% fuerte, >6% excelente; mid/large >1% sólido. YouTube: <10K >3% fuerte; mid/large ~2.7-3%. Fuente: help.modash.io/en/articles/6542471; modash.io/tiktok-engagement-rate-calculator.

**View-botting en clips (la señal accionable con API oficial):** como Octopus no ve las IPs de las views, la huella #1 es el DESBALANCE views vs engagement: un clip con muchas views y likes/comments/shares desproporcionadamente bajos. Fuente: spideraf.com/articles/what-is-view-botting; anura.io/fraud-tidbits/what-is-viewbotting.

**Fraude real en clipping (el que Octopus debe atrapar):** existen "bot-view rings calibrados casi exactamente al tope de payout por clip". Un fundador bajó el cap de $100 a $25 y las views "saltaron casi exactamente al nuevo umbral". Señal propia: detectar clips cuyas views se estancan sospechosamente en el cap de payout, y monitorear borrado/caída de views post-campaña. Fuente: findclout.com/blog/whop-content-rewards.

**Re-verificación post-aprobación (patrón de Whop a copiar):** Whop despliega un algoritmo anti-botting que detecta view-botting INCLUSO DESPUÉS de aprobar un submission; si detecta bot views, anula (voids) TODOS los payouts y banea de por vida. Octopus debe re-escrapear views tras el payout para atrapar inflado tardío. Fuente: grokipedia.com/page/Whop_Content_Rewards; autoclip.dev/blog/whop-bounty-programs-for-clippers.

**Restricción arquitectónica clave:** TikTok NO ofrece webhooks para actualizaciones de contenido (Display API). Hay que construir POLLING periódico de cada clip — ese polling ES la fuente de todas las señales (velocidad de views, ratio engagement/views, borrado post-payout). Fuente: developers.tiktok.com/doc/tiktok-api-v1-video-query; getphyllo.com/post/introduction-to-tiktok-api.

**Diferenciador de Octopus (transparencia):** clippers acusan a Whop de baneos opacos y de usar "flagged for botting" como excusa para no pagar. Octopus debe mostrar un score de autenticidad EXPLICABLE (las señales que lo bajaron, no una caja negra) + proceso de apelación. Fuente: findclout.com/blog/whop-content-rewards; clipaffiliates.com/blog/is-whop-clipping-legit.

**Cómo venderlo a marcas:**
- Estructura de score 1-100 con componentes desglosados (modelo HypeAuditor AQS: engagement rate + % audiencia real + bots, con 53+ patrones ML) y clasificación de audiencia en 4 buckets (Real people / Influencers / Mass followers / Suspicious accounts) — feature vendible. Fuente: hypeauditor.com/blog/hypeauditor-fake-followers-detection.
- Output UX de referencia (Modash): credibility score + % followers sospechosos + veredicto simple. El análisis de grafo de red es difícil de replicar sin datos masivos, pero el output no. Fuente: help.modash.io/en/articles/5649607.
- Lenguaje de marketing a traducir: "views verificadas", "bot-free", "score de autenticidad", "solo pagas por audiencia real". Un sello de datos oficiales (API partner) es diferenciador de confianza. Fuente: grokipedia.com/page/Whop_Content_Rewards; blog.hypeauditor.com/how-hypeauditor-helps-marketers.
- **Dato de venta para justificar el premium:** estudio de 100K cuentas encontró que 37,2% de los followers de influencers son falsos — problema estructural, no marginal. Fuente: sociavault.com/blog/fake-follower-study-key-findings; amraandelma.com/influencer-fraud-statistics.

## 3. Conectar redes — veredicto por plataforma

### 3a. YouTube (el caso fácil — implementar primero)

- **Views públicas:** Data API v3 (`videos.list` con `part=statistics`) devuelve viewCount, likeCount, commentCount de CUALQUIER video sin ser dueño, solo con API key. Fuente: developers.google.com/youtube/analytics/channel_reports.
- **Métricas privadas (retención, minutos vistos, suscriptores ganados):** requieren OAuth del creador dueño + Analytics API con scope `yt-analytics.readonly` (API separada, cuota independiente). Solo del propio canal (`ids=channel==MINE`). Fuente: developers.google.com/youtube/analytics/reference.
- **Scopes:** `youtube.readonly` (listar videos+stats públicos) y `yt-analytics.readonly` (retención) — ambos SENSIBLES (no restringidos): requieren verificación de app pero NO auditoría de terceros. Fuente: developers.google.com/youtube/v3/guides/auth/server-side-web-apps.
- **Verificación de app:** "hasta 10 días" oficial (terceros citan 2-4 semanas). Requiere: dominio verificado en Search Console, pantalla de consentimiento real, home page pública (no tras login), política de privacidad en el mismo dominio, declarar scopes con justificación, y video demo (no listado, en inglés) mostrando el flujo OAuth completo + client ID en la URL. Fuente: developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification.
- **Piloto:** en estado "Testing" hasta 100 test users sin verificar. **Trampa crítica:** en Testing + External, Google REVOCA los refresh tokens a los 7 días → la conexión se rompe semanalmente. Para persistencia hay que pasar a producción (verificado). En producción el refresh token solo expira tras 6 meses sin uso. Fuente: support.google.com/cloud/answer/7454865; unipile.com/google-oauth-refresh-token.
- **Cuota:** Data API v3 gratis; 10.000 unidades/día. `videos.list`=1 u, `search.list`=100 u (EVITAR). Con videos.list se leen ~10.000 videos/día. Para escalar, formulario de extensión (revisión manual). Fuente: developers.google.com/youtube/v3/determine_quota_cost.
- **Implementación OAuth:** `access_type=offline` + `prompt=consent` (garantiza refresh token), intercambiar el code server-side en `app/api/youtube/callback/route.ts`, guardar refresh token cifrado en Supabase. Límite: 100 refresh tokens por cuenta Google por client ID. Fuente: developers.google.com/youtube/v3/guides/auth/server-side-web-apps.

### 3b. Instagram (viable pero NO para día 1 del MVP)

- **API correcta:** "Instagram API with Instagram Login" (Business Login) — el creador se autentica con credenciales de IG, NO requiere Facebook Page, base URL graph.instagram.com. Reservar "Facebook Login" solo si necesitaras hashtag search o gestión de Ads. Fuente: developers.facebook.com/docs/instagram-platform/overview.
- **Scopes mínimos (solo 2):** `instagram_business_basic` + `instagram_business_manage_insights`. No pedir content_publish ni manage_messages (los más escrutados). Fuente: developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights.
- **Métrica "views" por Reel:** existe nativamente. `GET /{ig-media-id}/insights?metric=views` = "número total de veces que el media se reprodujo". Fuente: misma.
- **Requisito duro:** cuenta Business/Creator obligatoria; personales EXCLUIDAS. Convertir es gratis, <5 min, sin mínimo de seguidores, reversible, conserva TODO el contenido — PERO la cuenta pasa a ser pública. El onboarding debe guiar/verificar la conversión. Fuente: help.instagram.com/502981923235522; creatorflow.so/blog/switch-instagram-personal-to-professional.
- **Retraso de 48h (crítico para pagos):** Meta documenta "delay up to 48 hours" en insights. NO liquidar por views en tiempo real; usar ventana de 48-72h para estabilizar. Fuente: developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights.
- **Tokens:** short-lived (1h) → long-lived (60 días), refrescable por otros 60d si tiene ≥24h y sigue vigente. Un token 60 días sin refrescar EXPIRA. Necesita cron de refresco proactivo en Supabase. Fuente: developers.facebook.com/docs/instagram-platform/reference/refresh_access_token.
- **App Review OBLIGATORIO:** conectar cuentas de terceros = "Advanced Access" = App Review. Pasos: cuenta Meta Developer → app Business → producto Instagram → OAuth → probar en Development Mode con cuentas propias → ≥1 llamada API exitosa → enviar review con screencast → Live. Tiempos: review 2-4 semanas, proceso completo 4-6 semanas, la mayoría rechazada al primer intento. Fuente: developers.facebook.com/docs/instagram-platform/app-review; getphyllo.com/post/instagram-api-integration-101.
- **Aprobar a la primera:** screencast lento y ANOTADO mostrando login del creador → conexión a Octopus → lectura de views de un Reel, justificando que manage_insights se usa para calcular pagos por visualizaciones. Fuente: postmoo.re/blogs/meta-app-review-disapproved-how-to-get-approved.
- **Veredicto:** VIABLE pero postergar el lanzamiento público; EMPEZAR YA el trámite en paralelo (app Business + OAuth en Development Mode con cuentas propias) para que quede listo ~4-6 semanas después sin bloquear el MVP (que arranca con TikTok). Fuente: developers.facebook.com/docs/instagram-platform/overview.

### 3c. TikTok (ya integrado — el motor del MVP)

- **Cómo se obtiene view_count (núcleo del feature):** OAuth del creador (scopes `user.info.basic` + `video.list`) → `POST https://open.tiktokapis.com/v2/video/list/` (o `/v2/video/query/` para IDs). El objeto Video incluye view_count (int64), like_count, comment_count, share_count, id, create_time, share_url, video_description, duration. Devuelve solo videos públicos, ordenados por create_time desc, paginados. Fuente: developers.tiktok.com/doc/tiktok-api-v2-video-object; tiktok-api-v2-video-list.
- **Followers requieren scope extra:** los scopes user.info se acumulan — `user.info.stats` añade follower_count, following_count, likes_count, video_count. `user.info.profile` añade bio_description, is_verified, username. El `union_id` identifica al mismo usuario entre apps del mismo developer (clave para deduplicar creadores sin duplicados). Fuente: developers.tiktok.com/doc/tiktok-api-v2-get-user-info.
- **Tokens:** access_token expira a 24h (refrescable sin consentimiento); refresh_token expira a 365 días. **Bug clásico — rotación:** "The returned refresh_token may be different... You must use the newly-returned token if the value is different". El job de refresh DEBE hacer UPDATE del refresh_token en cada llamada o desconectas al creador. Refresh: `POST /v2/oauth/token/` con grant_type=refresh_token. Revocar (botón "Desconectar"): `POST /v2/oauth/revoke/` (server-side, usa client_secret). Fuente: developers.tiktok.com/doc/oauth-user-access-token-management.
- **Flujo OAuth web:** Authorize `https://www.tiktok.com/v2/auth/authorize/` con client_key, response_type=code, redirect_uri, scope, state (anti-CSRF) → callback con ?code&state → token exchange `POST /v2/oauth/token/`. PKCE solo obligatorio para desktop. El callback ya existe en app/api (fuente recurrente de bugs según CLAUDE.md) — validar state y registrar redirect_uri de producción y de Vercel preview. Fuente: developers.tiktok.com/doc/login-kit-web.
- **Rate limits:** 600 req/min por endpoint (429 al exceder). Con miles de clippers, encolar/espaciar los polls y cachear; refrescar métricas por lotes, no en cada page-load. Fuente: developers.tiktok.com/doc/tiktok-api-v2-rate-limit.
- **UX de referencia (Linktree Profile Kit):** un botón único "Add TikTok account" dispara OAuth → previsualización inmediata del perfil + primeros 6 videos como confirmación visual. Copiar: "conecta una vez, nosotros leemos tus vistas". Fuente: linktr.ee/help/en/articles/5826407.
- **App Review TikTok — checklist para pasar a la primera:** sitio web público completo (NO landing/login sueltos), Privacy Policy + ToS visibles en el FOOTER SIN abrir menús y activos, verificar propiedad del dominio, nombre custom que coincide con el sitio SIN usar "TikTok", pedir solo login kit + user.info.basic + video.list (+ user.info.stats si muestras followers). Video demo: 1-5 videos ≤50 MB mostrando el flujo end-to-end en el DOMINIO real (== Website URL o rechazo automático), obligatorio demostrar en Sandbox la primera vez. Tiempo: días a ~2 semanas. Fuente: developers.tiktok.com/doc/app-review-guidelines; getting-started-faq.
- **Sandbox:** máx 5 por app, hasta 10 cuentas TikTok "target users" cada uno. Display API (user.info, video.list) SÍ funciona en sandbox. Plan: 1 sandbox + 2-3 cuentas propias, validar login→view_count antes de gastar un intento de review. Fuente: developers.tiktok.com/blog/introducing-sandbox; add-a-sandbox.

**Plan B TikTok (código-en-bio, para lanzar antes de la aprobación):**
- **oEmbed API:** `GET https://www.tiktok.com/oembed?url=<video_url>` — sin auth, sin API key, sin review. Devuelve title, author_name, author_url, html embed, thumbnail. **LIMITACIÓN CLAVE: NO devuelve view_count ni engagement.** Solo sirve para verificación de propiedad y embeber clips mientras se pasa el review — el pay-per-view real necesita SÍ o SÍ la Display API aprobada. Fuente: developers.tiktok.com/doc/embed-videos.
- **Verificación código-en-bio como puente:** generar token único por creador → pegarlo en bio → confirmar propiedad. Nota: oEmbed da author_url pero NO el texto de bio; para leer bio hace falta scraping del perfil o pedir un video con el código (author_name/author_url confirman la cuenta). No reemplaza la medición de vistas. Fuente: misma.

**Regla práctica OAuth vs código-en-bio:** OAuth reduce fricción y da datos verificados/continuos pero depende de aprobación de la app y tiene riesgos si confías en claims no verificados (caso Azure AD 2023: account takeover por confiar en email no verificado). El código-en-bio añade fricción pero NO requiere aprobación de app y es el diferenciador de marketing ("<5 min, sin KYC"). Enfoque en capas: OAuth para datos ricos, código-en-bio para onboarding sin fricción de aprobación. Fuente: descope.com/learn/post/social-login; securityboulevard.com/2025/11/authentication-provider-types.

## 4. Cómo creció SideShift: playbook replicable en Chile

**Timeline (velocidad):** cold call fundacional (~abril 2025) → pivote a UGC (mayo 2025) → CEO Amir (ex ingeniero mecánico en Shell) deja Shell (julio 2025) → entra a Y Combinator (sept 2025) → programa de creadores 0-1. En ~6 meses pasaron de 0 a cientos de miles de creadores. Fundada ~junio 2024. Fuente: WebSearch founder story; crunchbase.com/organization/sideshift-6a4b.

**Los 3 motores del crecimiento explosivo (replicables sin YC gracias a la ventaja de idioma/localización):**

1. **Founder-led content:** Amir publicó personalmente 627 videos mientras aún trabajaba full-time, volviéndose experto del algoritmo ANTES de contratar a nadie. Consejo explícito: "intenta volverte viral tú mismo antes de contratar a alguien para hacerlo". **Para Octopus:** los fundadores deben publicar cientos de videos en TikTok/IG chilenos para aprender el hook en español chileno; el fundador es el primer creador y el primer caso de éxito. Fuente: WebSearch founder story / LinkedIn / Instagram C7RxQctMgyH.

2. **Ejército UGC pagado (0→1):** contrataron 15 creadores top, generaron 45M de vistas y ~10.000+ nuevos clientes, construyendo el sistema de contenido desde cero. **La demanda de creadores se construye ANTES que la de marcas.** Para Octopus: reclutar un núcleo de 10-15 creadores chilenos top pagados directamente, generar volumen de vistas demostrable, y usar esos resultados como pitch de outbound a las primeras marcas. Fuente: WebSearch; sideshift.app.

3. **Contenido orgánico nativo:** "videos cortos que frenan el scroll y se sienten nativos del feed", usando trends y sonidos, estética "For You Page" en vez de anuncios pulidos; los creadores publican desde SUS cuentas. Cada creador reclutado es un canal de distribución que atrae más creadores (loop). Cuenta @_sideshift en IG; contenido tipo "How To Land Your 1st UGC Deal in 24 Hours!". Fuente: sideshift.app/platform/tiktok; instagram.com/_sideshift.

**Prueba social como motor de registro (día 1):** SideShift exhibe destacados 700.000+ creadores, 1.500+ marcas, 5.000M+ vistas en 90 días, $100M+ pagados. Octopus debe mostrar contadores en vivo (creadores, vistas 90 días, CLP pagados) desde el día 1, con cifras reales aunque pequeñas, actualizadas semanalmente. Fuente: sideshift.app/creators; sideshift.app/platform/tiktok.

**Ampliar el TAM al mercado masivo (clave para escala tipo millón):** el mensaje es "cero barrera de entrada — sin seguidores, solo un teléfono y ganas de publicar" + historias aspiracionales ("deja tu pega, gana $10.000/mes"). Esto lleva el mercado del nicho influencer al masivo. Fuente: WebSearch SideShift Bootcamp; sideshift.app/creators.

**Programa de embajadores (distinguir dos cosas):** SideShift ofrece "campus ambassador"/"brand ambassador" como TIPO DE CAMPAÑA que las marcas publican (producto monetizable). Por separado, Octopus debe diseñar su PROPIO programa de embajadores universitarios en Chile para reclutar creadores (adquisición). No confundir: embajador-de-marca = producto; embajador-de-Octopus = adquisición. Fuente: WebSearch campus ambassador program.

## 5. Features nuevas de SideShift — qué copiar

**SideShift Discover (feature estrella más nueva, ~junio 2026, aún no mapeada por Octopus):** marketplace/directorio DENTRO de SideShift que conecta marcas con proveedores de servicios — agencias UGC, clippers, campaign managers, talent agencies. Nació porque reciben 7.000+ inbounds/mes pidiendo "done-for-you". Ya hay 50+ agencias operando toda su operación sobre la plataforma. **Para Octopus:** añadir una capa "Discover" (pestaña separada, monetizable) donde agencias/clippers/managers chilenos publiquen su perfil de servicios y las marcas los contraten llave-en-mano. Es la puerta al segmento agencia/enterprise, el más rentable. Fuente: linkedin.com/company/sideshiftapp (post Nick Lawton); sideshift.app/pricing (White Glove desde $20.000/mes).

**Gamificación tipo Duolingo (núcleo replicable):**
- Niveles Bronze → Silver → Gold, se sube según reviews, performance y course completion. "Think Duolingo for creators". Cada video da XP y mejora el Creator Profile. Octopus debe definir umbrales de XP por nivel (SideShift no publica los números). Fuente: sideshift.app/creators.
- **Bootcamp** (motor de formación gamificado): convierte a cualquiera con un teléfono en "distribution machine", combina niveles + XP + badges + formación estructurada. Diferenciador fuerte en LATAM: un bootcamp de clipping/UGC en español que forme y retenga novatos. Fuente: sideshift.app; netinfluencer.com/nick-lawton-on-building-sideshift.
- **Badge verificado:** curso gratuito de formación UGC (bajo sección "Badges") que otorga un verified badge que señala a las marcas que el creador "va en serio" — sube la calidad percibida. Fuente: sideshift.app/creators.
- **Leaderboard:** ranking público de performance en tiempo real, enmarcado como esfuerzo grupal. Top performers ganan $10.000-$20.000/mes; 10 creadores han ganado +$100.000 cada uno. Fuente: netinfluencer.com/nick-lawton-on-building-sideshift.

**Portfolio compartible público (v2.11, 21-mar-2026):** perfil profesional del creador como portafolio — experiencia pasada, handles sociales, links a videos top, historial de partnerships. Compartible externamente. Octopus puede dar URL pública tipo `octopus.app/@usuario` — tarjeta de presentación + canal de adquisición orgánica (SEO/viralidad). Fuente: apps.apple.com/us/app/sideshift-earn-money/id6481115809; sideshift.app/creators.

**Communities + chat (v2.14/v2.15, 6-may-2026):** comunidades (espacios grupales de creadores) + motor de chat renovado. Octopus debería tener chat 1-a-1 marca-creador Y espacios de comunidad grupales. Fuente: apps.apple.com App Store (What's New).

**Calling in-app (v2.12, 26-mar-2026):** llamadas de voz/video dentro de la app (briefs/entrevistas sin salir). Octopus podría integrarla vía WebRTC. Fuente: misma.

**Onboarding "one common application + one-tap apply":** (1) crear cuenta gratis; (2) completar perfil ("common application" única); (3) adjuntar handles (personales y/o UGC); (4) linkear videos top; (5) opcional: curso UGC gratuito → badge verificado. "Aplica a deals con un tap, sin CV". El portafolio de 5-10 videos spec reemplaza el follower count como filtro de calidad. Reduce drásticamente el drop-off. Fuente: sideshift.app/creators.

**SideShift Pro (monetización del lado creador):** membresía premium a $9.99/$79.99/$249.99 — aplicaciones ilimitadas, early access a deals, visibilidad premium, prioridad en oportunidades bien pagadas. Octopus podría añadir un "Pro" para clippers. Fuente: apps.apple.com App Store.

## 6. UI y microcopy para clonar

**Estilo visual:** light mode por defecto (assets hero-light.svg, footer-light.svg), sans-serif limpia y moderna, mucho video de fondo en stat cards, layout de una columna con secciones apiladas. Layout home: hero → carrusel de logos → tarjetas de métricas → carrusel de testimonios → grid de features → tabla comparativa → marketplace → acordeón FAQ → footer. (Nota: sideshift.app UGC ≠ sideshift.ai exchange cripto.) Fuente: sideshift.app.

**Navegación global:** Platform, Solutions, Pricing, Resources, For Creators, Log in. Footer: Blog, Docs, Pricing, Contact Us, Case Studies, For Creators, Contact Support, Privacy Policy, Terms of Service. Fuente: sideshift.app.

**Hero marca (traducción directa):**
- Headline: "The Operating System for Running UGC at Scale" → "El sistema operativo para hacer UGC a escala".
- Sub: "Recruit UGC creators, manage campaigns, track results, and pay them automatically" → "Recluta creadores UGC, gestiona campañas, mide resultados y págales automáticamente".
- CTAs: "Start Free Trial"/"Book a Demo"/"Log in"/"For Creators" → "Prueba gratis"/"Agenda una demo"/"Iniciar sesión"/"Para creadores". Fuente: sideshift.app.

**Titulares de sección del home (esqueleto exacto, en orden):** "Trusted By Top Brands Worldwide" → "Numbers That Power SideShift" → "Hear why teams choose SideShift" → "How SideShift Works for Brands" → "One Platform for All Your UGC Campaigns" → "The new standard for creator marketing" → "Creator marketing starts with proven talent" → "Launch Your UGC Campaign Today" → "Have Questions? We Have Answers". Fuente: sideshift.app.

**4 stat-cards (número grande + label 2 líneas):** "1,500+ Brands / Actively hiring", "700,000+ Creators / Already onboarded", "5B+ Views / Delivered last 90 days", "$100M+ Paid Out / To creators seamlessly". Header alterno en /creators: "The Largest UGC Creator Network". Fuente: sideshift.app/platform/creator-marketplace.

**4 pilares para marcas (copy exacto):** "Source Creators / Reach thousands of creators instantly" → "Encuentra creadores"; "Track Performance / See content, views, engagement, and conversions in real time" → "Mide resultados"; "Automate Payments / Handle payouts and invoices without manual work" → "Automatiza pagos"; "Manage Creators / Organize your roster and run campaigns seamlessly" → "Gestiona creadores". Fuente: sideshift.app.

**Tabla comparativa:** 3 columnas "SideShift vs Doing it yourself vs Hiring an agency" → "Octopus vs Hacerlo solo vs Contratar una agencia". Variante marketplace "UGC vs Traditional Influencer Marketing" con 6 filas (Content Ownership, Cost, Authenticity, Volume, Performance, Rights Usage) y ventajas UGC: "Full usage rights", "Scalable output-based pricing", "Native organic style", "250+ videos/month possible", "Real-time analytics", "Use across organic and paid advertising". Fuente: sideshift.app/platform/creator-marketplace.

**Hero creadores:** "The UGC Platform for Creators!" → "La plataforma UGC para creadores". Sub: "SideShift connects you directly with leading brands, handles the contracts and payouts, and lets you focus on creating" → "...te conecta directo con marcas líderes, gestiona los contratos y pagos, y te deja enfocarte en crear". CTAs: "Join as a Creator"/"Explore Gigs" → "Únete como creador"/"Explorar gigs". Fuente: sideshift.app/creators.

**4 módulos del dashboard del creador:** "Centralized Opportunities / Find & apply to campaigns from top brands"; "Payments Built-In / Track earnings and receive payouts automatically"; "Track Performance / See views, clicks, and engagement from your content"; "Easy Delivery / Manage briefs, approvals and payments in one platform". Fuente: sideshift.app/creators.

**FAQ creadores (10 preguntas para traducir):** cómo me registro, quién puede unirse, qué es UGC vs influencer marketing, cómo funciona, puedo trabajar con varias marcas a la vez, qué tan rápido consigo mi primera campaña, cómo funcionan los pagos, hay comisiones para creadores, necesito crear cuentas nuevas, es seguro trabajar con marcas. **Respuesta de registro (verbatim para traducir):** "Create a free SideShift account, complete your profile (think of it as a common application), and attach your social handles (Personal and/or UGC accounts) plus links to top-performing videos... You can also take our free UGC training course (found under Badges) to earn a verified badge that signals to brands you're serious about UGC." Fuente: sideshift.app/creators.

**FAQ home marcas (13 preguntas):** cómo empiezo, cuesta dinero, para quién está hecho, qué creadores hay, UGC vs influencer marketing, qué esperar/cómo se mide el éxito, self-serve vs managed, qué tan rápido contrato, cómo se gestionan pagos y contratos, cómo mido performance, cómo sé que los creadores no me dejarán colgado, cómo se compara vs agencia, funciona para mi industria. Fuente: sideshift.app.

**Marketplace de creadores — filtros y tarjetas:** filtros por Plataforma (Instagram, TikTok, YouTube, Facebook) y por Industria (Health & Wellness, CPG, Apparel & Fashion, Tech & AI, Finance, Entertainment & Music, Gaming, Education, Travel, etc.). Tarjeta de creador: categoría, nombre, ubicación, foto. Mensajes: "Fill roles faster", "Source for fit, not guesswork". Fuente: sideshift.app/platform/creator-marketplace.

**Glosario de producto exacto (nombres de features):** Roster (plantel), Job Listing (oferta), Invites (invitaciones), Job Boost (destacar oferta), Applicants (postulantes), Briefs, one-click payouts, Sourcing, Chat, Scheduling, Real-time performance dashboard. Fuente: sideshift.app/platform/creator-marketplace.

**App móvil creador (copy de conversión):** "SideShift - Earn Money", subtítulo "Find jobs and get paid!" → "Encuentra trabajos y cobra". Bullets verbatim para la wallet/perfil: "Apply to brand deals with one tap" → "Postula a deals con un tap", "No resumes or complicated applications", "Instant payouts to your bank" → "Pagos instantáneos a tu banco", "Send invoices directly to brands" → "Envía facturas a las marcas", "media kit", "portfolio". Fuente: apps.apple.com App Store.

**Lógica de pagos a replicar (copy + mecánica):** "Automated payouts immediately after content approval with no manual transfers", "Performance-linked bonus structures tied to views, engagement, or conversions", "Creator payment status visible in real time". Para Chile: reemplazar W9/1099 por retención/boleta local; el payout lo cubre Whop. Fuente: sideshift.app/blog/ugc-creator-payments.

## 7. Decisiones para el fundador (con opción recomendada)

1. **Orden de integración de plataformas.** Opciones: TikTok primero / YouTube primero / IG primero. **Recomendado: TikTok como motor del MVP (ya integrado) + YouTube en paralelo (el más fácil: API key sin OAuth para views públicas), e iniciar YA el trámite de IG App Review (4-6 semanas) sin bloquear el lanzamiento.** IG se enciende ~6 semanas después.

2. **Verificación de propiedad: código-en-bio vs OAuth.** **Recomendado: enfoque en capas por plataforma.** YouTube → API key + código-en-bio (trivial). TikTok → OAuth (ya en el repo); si autoriza, lees bio_description directo y el código es redundante; usar código como fallback si evitas OAuth. Instagram → OAuth Creator/Business. El código-en-bio como puente de onboarding solo mientras esperas aprobaciones.

3. **Cómo empezar TikTok mientras esperas el App Review.** Opciones: esperar la aprobación / lanzar con Plan B oEmbed. **Recomendado: usar oEmbed + código-en-bio solo para onboarding y visualización, pero NO prometer pay-per-view hasta tener la Display API aprobada** (oEmbed no da view_count). Correr Sandbox con 2-3 cuentas propias antes de gastar un intento de review.

4. **Modelo de monetización a marcas.** Opciones: pay-per-view puro (tipo Content Rewards) / suscripción por volumen (tipo SideShift) / híbrido. **Recomendado: suscripción por volumen de videos en CLP (más predecible), 4 tiers con uno "Más popular" y toggle anual -30%, PLUS diferenciarte con workflow de aprobación + reporting que SideShift no tiene.** Estructura de referencia: Starter/Growth/Scale/Enterprise con unidades "Job Listing / Invites / Job Boost".

5. **Ventana de liquidación de pagos.** Opciones: tiempo real / ventana estabilizada. **Recomendado: ventana de 48-72h antes de calcular pagos** (IG documenta delay de 48h; evita montos fluctuantes), + re-escrapeo post-payout para atrapar inflado tardío.

6. **Anti-fraude: qué construir primero.** Opciones: score complejo tipo grafo de red / reglas mínimas. **Recomendado: empezar con el "Quick Check de 3 indicadores" (calidad comentarios + anomalía ER + growth = 93% precisión) + ratio views/engagement por clip + detección de views estancadas en el cap de payout.** Mostrar un score EXPLICABLE con las señales que lo bajaron + apelación (diferenciador vs la caja negra opaca de Whop).

7. **Gamificación.** Opciones: lanzar sin ella / copiar el modelo Duolingo. **Recomendado: copiar Bronze/Silver/Gold + XP por video + badge verificado por curso UGC gratis + leaderboard** — es el motor de activación (mercado masivo sin seguidores) y retención. Definir umbrales de XP propios (SideShift no los publica).

8. **Discover (capa de agencias/servicios).** Opciones: solo marketplace creador-marca / añadir Discover. **Recomendado: dejarlo para fase 2 pero diseñar la arquitectura pensándolo** — es la puerta al segmento agencia/enterprise (el más rentable), con tiers gestionados (self-serve $199-999 / managed / white-glove desde $20K).

9. **Adquisición inicial.** Opciones: outbound a marcas primero / ejército UGC primero. **Recomendado: replicar el playbook de SideShift — fundadores publican cientos de videos founder-led + reclutar 10-15 creadores chilenos top pagados directamente para generar vistas demostrables, y recién con esos resultados hacer outbound a marcas.** La demanda de creadores se construye antes que la de marcas.

10. **KYC de pagos.** **Recomendado: mantener separado el código-en-bio (prueba propiedad de cuenta) del KYC pesado (identidad para retirar dinero, que en Octopus ya cubre Whop).** No mezclar ambos en un mismo paso de onboarding.

**Huecos (no encontrados en los hallazgos, no inventar):** umbrales exactos de XP por nivel de SideShift; números precisos de retención/conversión del onboarding; costos exactos de ScrapingBee/Apify a escala Octopus en CLP; detalle de cómo SideShift computa su score de autenticidad interno (si lo tiene); métricas de precisión de las señales anti-fraude aplicadas específicamente a video/clips (los 87,3%/93% son de detección de cuentas influencer, no de view-botting de clips).