// App de Whop para los mensajes embebidos ("Octopus Messages").
// El App ID es PÚBLICO (va en el cliente). El client secret vive SOLO en Vercel
// (WHOP_OAUTH_CLIENT_SECRET) y nunca en el código.
export const WHOP_APP_ID = process.env.NEXT_PUBLIC_WHOP_APP_ID || 'app_D74Fuxu632GOeK'

// Scopes habilitados en la App de Whop (login + chat/DMs).
export const WHOP_OAUTH_SCOPES = [
  'openid', 'profile', 'email',
  'chat:read', 'chat:message:create',
  'dms:read', 'dms:message:manage', 'dms:channel:manage',
].join(' ')

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://octopus-frontend-tau.vercel.app'

// Arma la URL de autorización de Whop DESDE EL CLIENTE (sin depender de que el
// servidor lea la sesión, que vive en localStorage). El callback lee el user id del state.
export function whopAuthorizeUrl(userId: string, next: string): string {
  const state = btoa(JSON.stringify({ u: userId, n: next }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') // base64url
  const u = new URL('https://api.whop.com/oauth/authorize')
  u.searchParams.set('client_id', WHOP_APP_ID)
  u.searchParams.set('redirect_uri', `${APP_URL}/api/whop/oauth/callback`)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('scope', WHOP_OAUTH_SCOPES)
  u.searchParams.set('state', state)
  return u.toString()
}
