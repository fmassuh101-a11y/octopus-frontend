// Debug script para verificar configuración de Supabase
console.log('🔍 DIAGNÓSTICO DE SUPABASE AUTH')

// Verificar variables de entorno
console.log('📋 Environment Variables:')
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) + '...')

// Función para probar conexión básica
async function testSupabaseConnection() {
  const { createClient } = require('@supabase/supabase-js')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  try {
    console.log('🔗 Testing Supabase connection...')
    const { data, error } = await supabase.auth.getSession()

    console.log('📊 Connection test result:', {
      hasData: !!data,
      error: error ? error.message : 'No error'
    })

    return true
  } catch (err) {
    console.error('❌ Connection failed:', err.message)
    return false
  }
}

// Función para verificar configuración de auth
async function checkAuthSettings() {
  console.log('⚙️ Checking auth configuration...')

  // Esta información normalmente se verifica en el dashboard
  console.log('📝 Questions to verify in Supabase dashboard:')
  console.log('1. Is email confirmation enabled?')
  console.log('2. What is the site URL configured?')
  console.log('3. Are redirect URLs configured correctly?')
  console.log('4. Is Google OAuth provider configured?')
}

// Ejecutar diagnóstico
testSupabaseConnection()
checkAuthSettings()