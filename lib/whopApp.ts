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
