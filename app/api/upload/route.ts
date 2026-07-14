import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";
import { SUPABASE_URL } from "@/lib/config/supabase";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * POST /api/upload { kind: 'avatar'|'gig', dataUrl } → { url }
 * Sube imágenes a Storage (URLs livianas). NUNCA más base64 en la base:
 * los data-URLs de MB eran la causa principal de la lentitud en celular.
 */
export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 20 });
  if (blocked) return blocked;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!SERVICE_KEY) return NextResponse.json({ error: "Config incompleta" }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const kind = body.kind === "gig" ? "gig" : "avatar";
    const m = String(body.dataUrl || "").match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
    if (!m) return NextResponse.json({ error: "Imagen inválida" }, { status: 400 });

    const mime = m[1];
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 4 * 1024 * 1024) return NextResponse.json({ error: "Imagen muy pesada (máx 4MB)" }, { status: 400 });

    const ext = mime.split("/")[1].replace("jpeg", "jpg").replace("+xml", "");
    const bucket = kind === "gig" ? "gig-images" : "avatars";
    const path = `${user.id}-${Date.now()}.${ext}`;

    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "Content-Type": mime, "x-upsert": "true" },
      body: new Uint8Array(buf),
    });
    if (!up.ok) {
      console.error("[Upload]", up.status, (await up.text()).slice(0, 120));
      return NextResponse.json({ error: "No se pudo subir la imagen" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, url: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}` });
  } catch (e: any) {
    console.error("[Upload] error:", e?.message);
    return NextResponse.json({ error: "No se pudo subir la imagen" }, { status: 500 });
  }
}
