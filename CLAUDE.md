# OCTOPUS - Contexto del Proyecto

## Descripcion General
Octopus es un **marketplace que conecta creadores de contenido (influencers, UGC creators) con empresas** que buscan promocionar sus productos o servicios. Similar a Fiverr pero especializado en contenido digital y marketing de influencers.

**Stack tecnologico:**
- Frontend: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- Backend: Supabase (PostgreSQL, Auth, Storage, REST API)
- Hosting: Vercel
- AI: Google Gemini API (modelo `gemini-2.5-flash`)
- Pagos: Sistema interno con retiros a PayPal, transferencia bancaria, crypto (USDT/USDC)

**Admin principal:** fmassuh133@gmail.com

---

## Estructura de Usuarios

### Creadores
- Se registran y completan onboarding de 8 pasos
- Conectan redes sociales (TikTok, Instagram, YouTube)
- Aplican a gigs publicados por empresas
- Reciben contratos, entregan contenido, reciben pagos
- Comision de Octopus: 10%
- Retiro minimo: $10 USD

### Empresas
- Se registran y completan onboarding de 7 pasos
- Publican gigs especificando que contenido necesitan
- Revisan aplicaciones de creadores
- Envian contratos, aprueban contenido, liberan pagos

---

## Base de Datos (Supabase)

### Tablas Principales
- `profiles` - Perfiles de usuarios (creadores y empresas)
- `gigs` - Trabajos publicados por empresas
- `applications` - Aplicaciones de creadores a gigs
- `contracts` - Contratos entre empresa y creador
- `payments` - Pagos y transacciones
- `wallets` - Billeteras de usuarios
- `withdrawal_requests` - Solicitudes de retiro
- `support_conversations` - Conversaciones de soporte
- `support_messages` - Mensajes de soporte
- `support_admins` - Administradores de soporte

### Archivo de Datos Centralizado
`/lib/data/countries.ts` - Contiene:
- 150+ paises con codigos telefonicos, banderas, searchKeys
- 500+ ciudades del mundo
- Funciones helper: `getCountriesForPhone()`, `getCitiesFormatted()`

---

## Flujos de Onboarding

### Creador (8 pasos)
1. `/onboarding/creator/name` - Nombre completo
2. `/onboarding/creator/phone` - Telefono con codigo de pais
3. `/onboarding/creator/studies` - Estudios/carrera (incluye "No estudio actualmente")
4. `/onboarding/creator/location` - Ciudad (busqueda de 500+ ciudades)
5. `/onboarding/creator/testimonial` - Video testimonial
6. `/onboarding/creator/social` - Redes sociales
7. `/onboarding/creator/bio` - Biografia
8. `/onboarding/creator/photo` - Foto de perfil

### Empresa (7 pasos)
1. `/onboarding/company/business` - Nombre, website, App Store URL (con validacion)
2. `/onboarding/company/phone` - Telefono (150+ paises, solo numeros)
3. `/onboarding/company/about` - Descripcion de la empresa
4. `/onboarding/company/industry` - Industria
5. `/onboarding/company/size` - Tamano de empresa
6. `/onboarding/company/goals` - Objetivos
7. `/onboarding/company/review` - Revision final

---

## Sistema de Soporte (Chatbot)

### Componentes
- `/app/api/support/chat/route.ts` - API que conecta con Gemini AI
- `/components/support/SupportChatWidget.tsx` - Widget flotante (esquina inferior derecha)
- `/app/admin/support/page.tsx` - Panel admin para responder mensajes

### Flujo
1. Usuario abre chat, bot responde con IA (Gemini 2.5 flash)
2. Si usuario necesita ayuda humana, click "Hablar con un agente"
3. Se crea conversacion en `support_conversations`
4. Admin ve en `/admin/support` y responde
5. Usuario recibe respuesta (polling cada 8 segundos)

### API Key Gemini
- Key: `AIzaSyDb26jKEli_4Tx1jlhhf9amaGoKVW88DEo`
- Modelo: `gemini-2.5-flash` (tiene quota disponible)
- NOTA: `gemini-2.0-flash` tiene quota agotada

---

## Problemas Resueltos (Febrero 2025)

### 1. Perfil de creador no se guardaba
**Problema:** localStorage se sobreescribia en cada paso del onboarding
**Solucion:** Usar spread operator `...existing` para preservar datos previos

### 2. Pagina Recruit mostraba datos falsos
**Problema:** Se generaban numeros random de followers/engagement
**Solucion:** Mostrar 0 hasta tener datos reales de API de TikTok/Instagram

### 3. Recruit mostraba empresas ademas de creadores
**Problema:** Query no filtraba por user_type
**Solucion:** Filtrar `user_type=eq.creator` en la query

### 4. Faltaba opcion "No estudio" en onboarding
**Problema:** Creadores sin estudios no podian continuar
**Solucion:** Agregar "No estudio actualmente" al inicio de la lista de carreras

### 5. Validacion de empresa aceptaba basura
**Problema:** Se podia poner "asdfgh" como nombre o URL
**Solucion:** Validar que nombre tenga vocales, URL tenga formato valido

### 6. Solo 9 codigos de pais en telefono empresa
**Problema:** Lista hardcodeada muy corta
**Solucion:** Usar archivo centralizado con 150+ paises

### 7. Campo telefono aceptaba letras
**Problema:** Input no validaba
**Solucion:** `.replace(/\D/g, '')` para solo permitir digitos

### 8. Chatbot Gemini no funcionaba
**Problema:** Quota agotada en `gemini-2.0-flash`
**Solucion:** Cambiar a `gemini-2.5-flash` que tiene quota

---

## Pendiente / Futuro

### Prioridad Alta
- [ ] Verificacion real de TikTok/Instagram (OAuth) para obtener stats reales
- [ ] Sistema de pagos completo (Stripe/PayPal integration)
- [ ] Notificaciones push/email

### Prioridad Media
- [ ] Dashboard de analytics para empresas
- [ ] Sistema de reviews/ratings
- [ ] Chat directo entre creador y empresa
- [ ] Verificacion de identidad (KYC)

### Prioridad Baja
- [ ] App movil (React Native)
- [ ] Multi-idioma (ingles)
- [ ] Programa de referidos

---

## Comandos Utiles

```bash
# Desarrollo local
npm run dev

# Build
npm run build

# Deploy (automatico con push a main)
git push origin main

# Ver logs de Vercel
vercel logs
```

---

## Archivos Clave

| Archivo | Descripcion |
|---------|-------------|
| `/app/layout.tsx` | Layout principal, incluye SupportChatWidget |
| `/lib/data/countries.ts` | Paises, ciudades, codigos telefonicos |
| `/lib/config/supabase.ts` | Configuracion de Supabase |
| `/app/api/support/chat/route.ts` | API del chatbot con Gemini |
| `/app/company/recruit/page.tsx` | Busqueda de creadores |
| `/app/admin/support/page.tsx` | Panel admin de soporte |
| `/SUPPORT_CHAT_SQL.sql` | SQL para crear tablas de soporte |

---

## Credenciales y Config

- **Supabase URL:** `https://ftvqoudlmojdxwjxljzr.supabase.co`
- **Supabase Anon Key:** En `/lib/config/supabase.ts`
- **Gemini API Key:** En `/app/api/support/chat/route.ts`
- **Admin Email:** fmassuh133@gmail.com

---

*Ultima actualizacion: 11 Febrero 2025*
