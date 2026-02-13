import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCompanyAccount, createCreatorAccount } from "@/lib/whop";

/**
 * API para crear Companies en Whop
 * Cada usuario (empresa o creador) necesita una Company en Whop
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body; // "company" o "creator"

    // Obtener datos del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar si ya tiene cuenta Whop
    if (userData.whop_company_id) {
      return NextResponse.json({
        error: "Ya tienes una cuenta de pagos configurada",
        whop_company_id: userData.whop_company_id
      }, { status: 400 });
    }

    let whopCompany;

    if (type === "company") {
      // Crear cuenta para empresa
      whopCompany = await createCompanyAccount({
        name: userData.company_name || userData.name || user.email || "Company",
        email: user.email || "",
        userId: user.id,
      });
    } else if (type === "creator") {
      // Crear cuenta para creador
      whopCompany = await createCreatorAccount({
        name: userData.name || userData.username || user.email || "Creator",
        email: user.email || "",
        userId: user.id,
      });
    } else {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    // Guardar ID de Whop en nuestra DB
    await supabase
      .from("users")
      .update({
        whop_company_id: whopCompany.id,
        whop_setup_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      whop_company_id: whopCompany.id,
      message: "Cuenta de pagos creada exitosamente",
    });

  } catch (error) {
    console.error("[Whop Companies] Error:", error);
    return NextResponse.json(
      { error: "Error al crear cuenta de pagos" },
      { status: 500 }
    );
  }
}
