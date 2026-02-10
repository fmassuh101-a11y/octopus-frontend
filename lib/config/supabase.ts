// Configuración centralizada de Supabase
// TODAS las credenciales deben venir de aquí

// URL de Supabase - es seguro exponer públicamente
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftvqoudlmojdxwjxljzr.supabase.co'

// Anon Key - es seguro exponer públicamente (protegido por RLS)
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

// Validación de configuración
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase configuration. Check environment variables.')
}

// Helper para construir URLs de la API REST
export function getSupabaseRestUrl(table: string, query?: string): string {
  const base = `${SUPABASE_URL}/rest/v1/${table}`
  return query ? `${base}?${query}` : base
}

// Headers comunes para requests
export function getSupabaseHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}
