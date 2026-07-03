// Permisos granulares que el dueño puede dar a cada miembro del equipo.
// Modelo RBAC: un rol trae permisos por defecto, y el dueño puede ajustar
// cada permiso individualmente (principio de mínimo privilegio).

export const PERMISSIONS = [
  { key: 'create_campaigns', label: 'Crear campañas y gigs' },
  { key: 'edit_campaigns', label: 'Editar campañas y gigs' },
  { key: 'delete_campaigns', label: 'Eliminar campañas y gigs' },
  { key: 'review_applicants', label: 'Ver aplicantes' },
  { key: 'accept_applicants', label: 'Aceptar/rechazar aplicantes' },
  { key: 'send_contracts', label: 'Enviar contratos' },
  { key: 'approve_content', label: 'Aprobar contenido entregado' },
  { key: 'message_creators', label: 'Enviar mensajes a creadores' },
  { key: 'manage_payments', label: 'Gestionar y liberar pagos' },
  { key: 'view_analytics', label: 'Ver analíticas' },
  { key: 'manage_team', label: 'Invitar y gestionar el equipo' },
] as const

export type PermissionKey = typeof PERMISSIONS[number]['key']

export interface Role {
  key: string
  name: string
  desc: string
  perms: PermissionKey[]
}

const ALL: PermissionKey[] = PERMISSIONS.map(p => p.key)

export const ROLES: Role[] = [
  {
    key: 'manager', name: 'Manager', desc: 'Gestiona casi todo, menos pagos y equipo.',
    perms: ['create_campaigns', 'edit_campaigns', 'delete_campaigns', 'review_applicants', 'accept_applicants', 'send_contracts', 'approve_content', 'message_creators', 'view_analytics'],
  },
  {
    key: 'editor', name: 'Editor', desc: 'Crea y edita campañas, ve aplicantes y mensajea.',
    perms: ['create_campaigns', 'edit_campaigns', 'review_applicants', 'message_creators', 'view_analytics'],
  },
  {
    key: 'viewer', name: 'Colaborador', desc: 'Solo mira campañas, aplicantes y analíticas.',
    perms: ['review_applicants', 'view_analytics'],
  },
  {
    key: 'custom', name: 'Personalizado', desc: 'Tú eliges exactamente qué puede hacer.',
    perms: [],
  },
]

export function defaultPermsForRole(roleKey: string): PermissionKey[] {
  return (ROLES.find(r => r.key === roleKey)?.perms) || []
}

export const ACTIVE_PERMS_KEY = 'octopus-active-perms'

// ¿Tengo este permiso en el espacio activo?
// En mi propia cuenta (dueño) tengo TODOS. En una empresa donde soy miembro,
// se leen los permisos guardados al entrar a ese espacio.
export function hasPermission(key: PermissionKey): boolean {
  if (typeof window === 'undefined') return true
  const active = localStorage.getItem('octopus-active-company')
  if (!active) return true // dueño de mi propia cuenta
  try {
    const perms: string[] = JSON.parse(localStorage.getItem(ACTIVE_PERMS_KEY) || '[]')
    return perms.includes(key)
  } catch { return false }
}

export function setActivePerms(perms: string[] | null) {
  if (perms) localStorage.setItem(ACTIVE_PERMS_KEY, JSON.stringify(perms))
  else localStorage.removeItem(ACTIVE_PERMS_KEY)
}
