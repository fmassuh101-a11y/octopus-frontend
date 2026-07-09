import { NextResponse } from 'next/server'

// RUTA DESHABILITADA (jul 2026, auditoría de seguridad).
// Movía dinero con monto arbitrario del cliente saltándose el ledger y la comisión.
// El flujo válido de retiro es POST /api/whop/request-withdraw (validado + atómico).
const gone = () => NextResponse.json({ error: 'Ruta deshabilitada. Usá /api/whop/request-withdraw.' }, { status: 410 })
export async function GET() { return gone() }
export async function POST() { return gone() }
export async function PUT() { return gone() }
export async function PATCH() { return gone() }
export async function DELETE() { return gone() }
