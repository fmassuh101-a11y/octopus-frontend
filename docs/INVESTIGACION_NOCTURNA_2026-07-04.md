# Investigación Nocturna — 4 de julio 2026

> Preparada mientras Felipe duerme. 4 investigaciones en paralelo + auditoría de seguridad.

## Estado
- [ ] 1. Métodos de pago LATAM (payouts + cobros, plan B y C si Whop falla)
- [ ] 2. SideShift a fondo + competidores + plan de crecimiento con $0
- [x] 3. Legal Chile/LATAM (SII, ley fintech, datos personales, escrow)
- [ ] 4. Auditoría de seguridad del código
- [x] 5. Fixes críticos de seguridad preparados (`SECURITY_FIXES_2026-07-04.sql`)

## Pregunta clave para el Zoom de Whop
> "Can we charge our platform fee at **withdrawal** instead of per-payment? We want a custom % (3.5%) taken when creators cash out." (Whop soporta `application_fee` — confirmar si aplica a withdrawals o solo a checkouts.)

## Hallazgos de seguridad propios (ya con fix listo)
1. **CRÍTICO**: `process_payment` era llamable por cualquier usuario logueado vía `/rest/v1/rpc/` → robo de fondos. Fix: REVOKE a anon/authenticated.
2. **CRÍTICO**: cualquier usuario podía cambiarse su propio `plan`/`discount_percent` (UPDATE a su fila de profiles) → Enterprise gratis. Fix: trigger que congela esas columnas.
3. **CRÍTICO**: un invitado al equipo podía editarse sus propios `permissions`. Fix: trigger (solo el dueño de la empresa los cambia).
4. **ALTO**: wallets editables/creables con balance arbitrario desde el cliente. Fix: trigger fuerza balance 0 al crear y congela montos en updates de usuarios.

*(Las secciones siguientes se llenan cuando terminen los agentes.)*

## 1. Métodos de pago LATAM
_pendiente_

## 2. SideShift + competidores + crecimiento
_pendiente_

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

## 4. Auditoría de seguridad (agente)
_pendiente_

## Plan de mañana
_se arma al final con todo lo anterior_
