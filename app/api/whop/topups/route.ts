import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTopup, getPaymentMethods } from "@/lib/whop";

/**
 * API para que empresas agreguen fondos a su balance
 * Los Top-ups NO tienen fees
 */

// POST: Crear top-up
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, paymentMethodId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({
        error: "El monto debe ser mayor a 0"
      }, { status: 400 });
    }

    // Obtener whop_company_id del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("whop_company_id, role")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.whop_company_id) {
      return NextResponse.json({
        error: "Primero debes configurar tu cuenta de pagos"
      }, { status: 400 });
    }

    // Verificar que es una empresa
    if (userData.role !== "company") {
      return NextResponse.json({
        error: "Solo las empresas pueden agregar fondos"
      }, { status: 403 });
    }

    // Si no se proporciona paymentMethodId, obtener el primero disponible
    let methodId = paymentMethodId;
    if (!methodId) {
      const methods = await getPaymentMethods(userData.whop_company_id);
      if (methods.length === 0) {
        return NextResponse.json({
          error: "Primero debes agregar un método de pago",
          needsPaymentMethod: true
        }, { status: 400 });
      }
      methodId = methods[0].id;
    }

    // Crear top-up
    const topup = await createTopup({
      companyId: userData.whop_company_id,
      amount,
      paymentMethodId: methodId,
    });

    // Registrar en nuestra DB
    await supabase.from("company_topups").insert({
      company_id: user.id,
      whop_company_id: userData.whop_company_id,
      whop_topup_id: topup.id,
      amount,
      currency: "usd",
      status: "processing",
    });

    return NextResponse.json({
      success: true,
      topup_id: topup.id,
      amount,
      message: `$${amount} agregados a tu balance (sin fees)`,
    });

  } catch (error) {
    console.error("[Whop Topups] Error:", error);
    return NextResponse.json(
      { error: "Error al agregar fondos" },
      { status: 500 }
    );
  }
}

// GET: Obtener métodos de pago disponibles
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener whop_company_id del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("whop_company_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.whop_company_id) {
      return NextResponse.json({
        error: "Cuenta de pagos no configurada",
        methods: []
      }, { status: 400 });
    }

    const methods = await getPaymentMethods(userData.whop_company_id);

    // Mapear los métodos de pago a un formato simplificado
    const simplifiedMethods = methods.map(m => {
      const base = {
        id: m.id,
        type: m.payment_method_type,
        last4: null as string | null,
        brand: null as string | null,
      };

      // Si es una tarjeta, obtener los detalles
      if ('card' in m && m.card) {
        base.last4 = m.card.last4;
        base.brand = m.card.brand;
      }

      return base;
    });

    return NextResponse.json({
      methods: simplifiedMethods,
    });

  } catch (error) {
    console.error("[Whop Topups GET] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener métodos de pago", methods: [] },
      { status: 500 }
    );
  }
}
