// Configuración centralizada de Supabase
// TODAS las credenciales deben venir de aquí — para cambiar de proyecto
// Supabase basta con editar .env.local (y este fallback).

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://cnsyrgurwtufbynwrxjt.supabase.co'

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuc3lyZ3Vyd3R1ZmJ5bndyeGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNjYwNTQsImV4cCI6MjA5ODY0MjA1NH0.rpKy0saQFeB1Bq3V8tZE3FRuzEVb3CRlzO57E0y1Wfo'

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
