import { NextResponse } from 'next/server'
import { whopClient, OCTOPUS_COMPANY_ID, WHOP_ENVIRONMENT } from '@/lib/whop'

// Diagnóstico: verifica que la WHOP_API_KEY funciona (lectura segura, no mueve plata).
// Visitar /api/whop/ping en el navegador.
export async function GET() {
  if (!process.env.WHOP_API_KEY) {
    return NextResponse.json({ ok: false, error: 'Falta WHOP_API_KEY en las variables de entorno' })
  }
  if (!OCTOPUS_COMPANY_ID) {
    return NextResponse.json({ ok: false, error: 'Falta WHOP_OCTOPUS_COMPANY_ID en las variables de entorno' })
  }
  try {
    const company: any = await whopClient.companies.retrieve(OCTOPUS_COMPANY_ID)
    return NextResponse.json({
      ok: true,
      env: WHOP_ENVIRONMENT,
      companyId: OCTOPUS_COMPANY_ID,
      companyTitle: company?.title || company?.name || null,
      mensaje: 'Conexión con Whop OK — la API key funciona.',
    })
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      env: WHOP_ENVIRONMENT,
      status: e?.status || e?.statusCode || null,
      error: e?.message || String(e),
      pista: 'Si dice 401/403 la key no tiene permisos; si dice 404 revisá el company id.',
    })
  }
}
