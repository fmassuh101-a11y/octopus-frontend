import { NextResponse } from "next/server";

// RUTA DESHABILITADA (26 jul 2026).
//
// Transfería con origin_id = OCTOPUS_COMPANY_ID, o sea sacaba la plata de la
// cuenta de Octapi. Eso solo tenía sentido con el modelo viejo, donde todos
// los fondos caían en nuestra cuenta y el saldo era un número en Supabase —
// justo lo que no podemos hacer (retener fondos de terceros en Chile).
//
// Con el modelo nuevo el creador no necesita esta ruta: su plata ya está en SU
// propia cuenta de Whop desde que la empresa se la transfiere, y el retiro al
// banco lo hace desde el panel de Whop embebido en /creator/wallet.
//
// Se deja como 410 en vez de borrarla para que cualquier cliente viejo que
// todavía la llame reciba un error claro en lugar de un 404 mudo.
const gone = () =>
  NextResponse.json(
    { error: "Tu plata ya está en tu cuenta. Retírala al banco desde el panel de cobros en tu billetera." },
    { status: 410 }
  );

export async function GET() { return gone(); }
export async function POST() { return gone(); }
export async function PUT() { return gone(); }
export async function PATCH() { return gone(); }
export async function DELETE() { return gone(); }
