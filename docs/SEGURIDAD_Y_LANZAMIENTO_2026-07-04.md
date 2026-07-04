# Investigación de Seguridad + Lanzamiento — Octopus (4 jul 2026)

> 17 agentes en paralelo auditando el código real + investigando lanzamiento y features. Este doc se llena a medida que terminan.

## Estado de los agentes
### Seguridad (auditoría del código)
- [ ] 1. RLS profundo (quién lee/escribe qué, PII, acceso premium)
- [ ] 2. Funciones SECURITY DEFINER / RPC explotables
- [ ] 3. Rutas API — auth, ownership, IDOR
- [ ] 4. Dinero/escrow/wallets (doble gasto, montos negativos, retiros)
- [ ] 5. Auth y sesión (JWT, refresh, admin por email, backdoor)
- [ ] 6. Client-side / bypass de permisos (RBAC, features premium)
- [ ] 7. Inyección (SQL/PostgREST, XSS, prompt injection)
- [ ] 8. Búsqueda e inputs (ilike injection, código malicioso)
- [ ] 9. Secretos y env (keys, git, service key)
- [ ] 10. Rate limiting / DoS / abuso
- [ ] 11. Webhooks y terceros (Whop)
- [ ] 12. Subida de archivos / imágenes / storage
- [ ] 13. Lógica de negocio (race conditions, manipulación de estado)

### Lanzamiento y crecimiento
- [ ] 14. ¿Estamos listos para lanzar? Checklist pre-lanzamiento
- [ ] 15. Go-to-market LATAM con $0 (timing, "lanzar con todo")
- [ ] 16. Features diferenciadoras (batallas 1v1, pools, torneos, etc.)
- [ ] 17. Best practices de seguridad Supabase + Next.js con dinero

---
*(Secciones abajo, se completan al terminar cada agente.)*
