# GOAL — Cerrar Octopus (plan por partes, en orden)

Objetivo: dejar Octopus lista hoy. Cada parte se hace y se prueba antes de pasar a la siguiente.
Constraints fijos: NO emojis en la UI, precios/fees nunca inventados (siempre server-side),
la plata nunca pasa por cuentas de Octopus (Whop custodia), verificar con screenshots antes de decir "listo".

## PARTE 1 — Interfaz de pago más linda y confiable  [Claude]
- Rediseñar el MARCO de todos los checkouts embebidos (depósito, suscripción Pro, suscripción empresa, pagar creador): header con logo Octopus, sellos de "Pago seguro cifrado", "Powered by Whop", candado, logos de tarjetas (Visa/Master/Amex), y color de acento teal en el WhopCheckoutEmbed (accentColor).
- Que se vea premium y de confianza, no "bot".
- Verificar con screenshots.

## PARTE 2 — Requisitos de campaña que REALMENTE bloqueen  [Claude]
- Hoy los toggles (Requiere Instagram / TikTok / 21+ / mínimo de seguidores) existen pero NO bloquean nada.
- Guardar los requisitos en la campaña (columnas require_instagram, require_tiktok, require_age_21, min_followers).
- Al postular: si el creador no cumple → NO deja aplicar y muestra el motivo exacto:
  "Conectá tu TikTok antes de aplicar", "Este trabajo requiere 21+ años", "Necesitás X seguidores".
- Nota: el mínimo de SEGUIDORES real depende de tener los datos de TikTok/IG (Parte 6). Por ahora bloquea
  con lo que haya (handle conectado + edad); la verificación de seguidores se completa en la Parte 6.

## PARTE 3 — Salir de sandbox + confirmar KYC en producción  [Felipe + Claude]
### CONCLUSIÓN INVESTIGACIÓN KYC (jul 12): el redirect es INEVITABLE.
- Whop (como Stripe Connect) hostea la verificación de identidad por COMPLIANCE — no hay componente
  embebible de KYC (no existe "VerifyElement"). El identity check SIEMPRE redirige a la página hosteada de
  Whop → Sumsub, y vuelve por return_url. SideShift hace lo mismo (solo lo hace sentir fluido).
- El formulario largo (business/personal, fecha, teléfono) es el flujo de compliance de Whop — no se puede acortar.
- SÍ se puede embeber: el MÉTODO DE PAGO (agregar banco) vía embedded components; el identity check no.
- Acción: mantener el redirect lo más suave posible (abre en pestaña nueva, vuelve a Octopus, botón "Ya me verifiqué").
  No hay nada que "arreglar" — es un límite legal del proveedor. El bug real (email falso) ya está resuelto.

- Cuando Partes 1 y 2 estén, Felipe borra en Vercel las vars WHOP_API_KEY_Test y WHOP_OCTOPUS_COMPANY_ID_test → Redeploy.
- Verificar /api/whop/ping → "env":"production".
- Felipe hace el KYC con una cuenta de EMAIL REAL. Confirmar que pasa a "Verificado".
- Claude investiga si Whop tiene un flujo de KYC más simple/embebido (VerifyElement) y lo aplica si existe;
  si no, dejar el redirect lo más suave posible (vuelve a Octopus, botón "Ya me verifiqué").

## PARTE 4 — Mensajes nativos de Whop  [Claude, necesita app + OAuth]
- Crear una "app" en el dashboard de Whop + OAuth (scopes chat/dms), instalar @whop/embedded-components.
- Chat embebido empresa↔creador dentro de Octopus. Solo funciona en producción (no sandbox), sin costo.
- Reemplaza el chat actual.

## PARTE 5 — Prueba de retiro real con $10  [Felipe]
- Bajar el mínimo de retiro a $5-10 para arriesgar menos.
- Empresa deposita ~$10 real → paga al creador → creador (con KYC ok) retira a su banco.
- Confirmar que el payout llega. Es la única prueba con plata real (~$2-3 de fee).

## PARTE 6 — Vincular TikTok / Instagram / YouTube (OAuth real)  [Claude]
- Botón "Conectar" que hace OAuth real a cada red y trae followers/verificación/geografía de audiencia.
- Con esto: se muestran stats reales en el perfil, y el filtro de "mínimo de seguidores" (Parte 2) queda 100% funcional.
- Cierra el "vacío" de que hoy no verificamos nada de las redes.

## PARTE 7 — Pulido visual final  [Claude]
- Barrido de detalles: íconos precisos (Phosphor/Simple Icons), estados vacíos, fluidez estilo SideShift,
  fotos de campaña, "hace X", perfiles. Nada que se vea genérico/bot.

## PARTE 8 — Blindaje contra ataques  [Claude]
- Aplicar lo pendiente de la auditoría: activar rate limit distribuido (Upstash) en Vercel, revisar RLS
  tabla por tabla, cerrar rutas legacy, límites anti-fraude (velocity, retención antes de retirar),
  y confirmar que nadie puede robar plata / ver datos ajenos / romper la app.

## PARTE 9 — Lista de espera (muro de lanzamiento)  [Claude]
- Waitlist como MURO: cuando se activa, usuarios y empresas no entran a la app, solo se suman a la lista.
- Se deja construida pero APAGADA hasta el lanzamiento. Felipe tiene ideas para el diseño.

---
Orden de ejecución HOY: 1 → 2 → (avisar a Felipe) → 3 → 4 → 5 → 6 → 7 → 8 → 9.
Realidades a recordar: el KYC redirige por ley (Sumsub); en sandbox los payouts/KYC no se confirman;
los mensajes y payouts solo se prueban en producción.
