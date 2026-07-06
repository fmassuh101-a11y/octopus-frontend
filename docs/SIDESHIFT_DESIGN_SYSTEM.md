# SideShift V2 — Sistema de diseño (extraído de las 53 capturas reales)

Fuente: IMG_6325–6379 (Desktop). Objetivo: copiarlo EXACTO en Octopus (solo cambia el nombre).

## ADN visual
- **Tema CLARO**: fondo blanco/#F7FAFD. Header superior = degradado de cielo azul (#7CC0F8 → #EAF6FF) con **nubes** (arcos concéntricos blancos translúcidos).
- **Acento**: azul cielo. CTA = píldora full-width con degradado azul claro (#66B9F9 → #4BA0EF), texto blanco bold, sombra suave.
- **Cards**: blancas, borde gris clarísimo (#EEE), rounded-2xl/3xl, sombra sutil. Patrón: ícono cuadrado con fondo pastel a la izq + título bold + desc gris + chevron/candado a la der.
- **Tipografía**: sistema (SF/Inter). Títulos bold 28-34, números GIGANTES bold, labels gris #8E8E93.
- **Bottom nav**: **píldora flotante blanca** (rounded-full, sombra), 5 íconos SIN texto: Home, Lupa, Lápiz (cursos), Chat, Perfil. Activo = círculo gris claro detrás del ícono.

## Pantallas
### Home (dashboard creador)
- Fila superior de chips blancos: [liga mini-badge + nombre] [★ 5.0] [👑 PRO] [🔥 streak]
- "Your earnings" h2 → **$738.41 gigante** + chip meta "$1.000" a la derecha
- Barra de progreso azul gruesa redondeada
- Banner card "Affiliates" (ícono + texto + X para cerrar)
- "Your tasks today": checklist vertical de cards conectadas por línea punteada; check verde cuadrado redondeado izq, título (tachado si done), "0/4 · 4 xp", ilustración der.

### Search/Gigs
- Search bar redonda + botón filtros circular
- 3 tabs texto con subrayado negro activo: Gigs / My campaigns / History
- "Spotlight": card destacada carousel (logo cuadrado, brand, "Content Creator", $800/month) + dots
- "Browse": chips [Newest(activo azul borde)] [Trending] [Highest Paying]
- "Find by niche": chips 2 columnas con ícono
- Empty states: ilustración + texto + CTA azul píldora ("Browse gigs")

### Swipe deck de campañas (aplicar)
- "1/29 campaigns" arriba centro, X izq, grid-icon der
- Chip "⚡ 10/10 applications left today"
- Card gigante: imagen cuadrada, "Content Creator for [logo] Brand" título enorme
- Card 2 stats: [$400 +$1 CPM bonus | UGC Ads Creator type]
- "Swipe up to apply" abajo con flechita
- Vista grid: 2 col, imagen con chip de precio overlay, brand + "Content Creator"

### Review contract (contratos entrantes)
- Fondo NEGRO, "Review contract" título blanco
- Card blanca centrada: logo + brand + nombre campaña, **$2.00 CPM enorme**, chips (Every 60 posts / 2 creators)
- 3 botones píldora abajo: Decline (rojo), Review (azul), See all (violeta)
- Es un carousel horizontal de contratos

### Ligas (leaderboard)
- Fondo cielo full + nubes, X arriba izq
- Badge 3D hexagonal central con laureles (carousel: se ve la liga prev/sig a los lados)
- "Bronze League" título enorme
- Barra XP: "56 / 700 XP" + "Unlock 3 perks with Sapphire >"
- Lista: #rank, avatar, nombre, "$2.716 / 5.3M views"
- Fila "You" resaltada azul claro con borde
- "3.614 more creators ⌄" expandible
- Ligas: Bronze, Silver, Gold, Amethyst, Pearl, Sapphire(bloq), Emerald, Ruby, Amber, Diamond
- Cada liga bloqueada muestra sus perks como cards (ícono color + texto): p.ej. Sapphire: Priority Access, Top-Tier Placement, Weekly Spotlights. Diamond: Maximum Visibility, Endorsement, Enterprise Clients, "Top .1%"

### Rachas (streak)
- Cielo NARANJA + nubes, flama mascota con carita
- "2 day streak!" naranja
- Semana: chips Su..Sa, días logrados = flama con número
- "Streak challenge": card "14 days challenge / Day 2 of 14" + progreso con hitos 7/14/30
- Card 2 stats: "Jul 3, 2026 Streak started | 6 days Streak record"
- "Streak milestones": lista conectada por línea punteada: 7 días +50 XP (resaltado naranja), 14 +100, 30 +250, 60 +500, 90 +1.000

### Perfil
- Cielo + nubes, X izq, [lápiz|⚙️] der en píldora blanca
- Avatar circular grande centrado + mini-badge de liga colgando abajo
- Tabs subrayado: Profile / Posts
- Chips: Socials / Experiences / Featured posts
- Socials: cards 2-col (avatar gris, @handle con ícono IG/TikTok)
- Featured posts: 3 col de videos con ▶ y views
- Overview (tab en perfil propio): "Available balance" label + **$0,00.00 GIGANTE** + botón "Wallet" píldora azul; card 2x2: [🔥 2 days | 👁 14.3K views / ★ 5.0 rating | 💵 $738 earned]; card Affiliates; "Awards" fila de badges 3D
- Awards page: "Certifications" (grises bloqueadas: Fast Responder, Reliable Interviewer, CPM Master) + "Achievements" grid 3-col (Application Mastery 8/8, Earnings Mastery 3/12, TikTok View Milestones 2/8...)
- Metrics tab: chips All/Earnings/Views/Engagement + dropdowns Platform/Campaign + "Updated 3hr ago" + card 2x2 stats + gráfico líneas + rangos All/6M/3M/1M/1W

### Wallet (sheet blanco sobre perfil)
- Tarjeta bancaria estilo: $0,00.00 + "SIDESHIFT" watermark + avión logo
- Botones: [Invoicing | History]
- Banner amarillo Pro: "Pro lowers withdrawal fees... PayPal 5%→1%..." + botón Upgrade
- Banner naranja warning: "Withdrawals pending review (CL)..."
- CTA azul grande abajo

### Affiliates (sheet)
- "Refer people. Earn money." con laureles
- "What you earn": carousel cards ($5 sub Premium, $100 cuando refiere gana $1.000, $50 trial→paying, 10% hasta $100) + dots
- "How it works": cards numeradas 1. Share your link 2. They sign up...
- Dashboard: "Track qualified referral earnings", $0 Total earned, [1 Earning | 1 Signups], Claim $0 (deshabilitado), Referral link card con copy, código editable, "Commission over time" + empty chart
- CTA sticky "Start earning"

### Pro paywall
- Cielo + ilustración (avión + billete) + chip "Pro"
- "Pro creators earn 400% more" título gigante
- Sub + chip azul "Top Pro creators earn up to $15k/mo"
- Card beneficios con ✓: "Unlimited applications..."
- "Choose your plan": 2 cards lado a lado — Annual (borde azul activo, badge amarillo "SAVE 50%", $99.990, "Only 8.332 CLP/mo") | Monthly ($9.990, "Flexible, cancel anytime")
- "Subscribe now" píldora + "Restore purchases Terms Privacy"

### Cursos/Learn (tab lápiz)
- Tabs horizontales de cursos: ícono cuadrado + nombre + subrayado del color del curso (SideShift Onboarding amarillo, UGC Foundation azul, Content Basics rojo, Landing UGC Gigs verde, Account Health rosa)
- Título curso + candado + desc + ícono grande der
- Módulos: cards con ícono pastel + nombre + desc, conectadas por línea punteada; bloqueado = gris + candado circular; disponible = play verde
- Página curso: cielo amarillo, logo, "SideShift Onboarding", "Set up your profile...", "3 Modules · 10 Lessons", "0/10" contador; módulos como cards; lecciones = círculos flotantes alternados con labels ("Welcome to SideShift" play, resto candados)

### Mensajes
- Layout tipo LinkedIn: mini sidebar izq (chip home azul + botón "+" verde), search gris, chips Unread/Saved
- Lista: avatar cuadrado redondeado, nombre bold, hora der gris, preview 2 líneas gris, chevron
- Separadores hairline

### Settings
- Header simple "< Settings"
- Grupos de cards blancas con filas + chevron: [Free/Upgrade to Pro/Restore] [Sound effects toggle] [Change password/email/phone] [Help/Privacy/Terms] [Logout rojo/Delete account rojo]

### Edit profile
- Cielo, X izq, ✓ der (círculos celestes)
- Avatar + lápiz
- "Full name" input blanco redondeado
- "Date of birth" wheel picker iOS
- "Education status": chips 2-col con ícono (In high school, In college, GED, Graduated, Didn't go to college, Grad school), activo = borde azul + bg celeste
- "Expected graduation year": chips años
- "School": card selector
- "Niches: Select up to 5": chips full-width con ícono

## Claves de fluidez
- TODO son sheets/overlays que suben, X circular celeste arriba izq para cerrar
- Una acción principal por pantalla, CTA sticky abajo
- Números como héroes (dinero gigante)
- Checklists con líneas punteadas conectando pasos
- Carousels con dots en todo (spotlight, what you earn, contratos)
- Estados vacíos SIEMPRE con ilustración + texto + CTA
