import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

/**
 * Autentica al caller de una ruta API.
 * Acepta el access token de Supabase vía header `Authorization: Bearer <token>`
 * (la app guarda la sesión en localStorage, no en cookies, así que los
 * clientes DEBEN mandar este header al llamar rutas protegidas).
 * Devuelve el usuario o null.
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return null

  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}
