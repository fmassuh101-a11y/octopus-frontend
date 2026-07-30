import { authHeaders } from '@/lib/auth/clientToken'

// Dispara el correo que corresponde a algo que acaba de pasar.
//
// Se llama y se sigue: NO se espera la respuesta. Si el correo falla, el
// usuario no tiene por qué enterarse ni esperar — lo que importaba (crear el
// contrato, subir la entrega) ya ocurrió.
//
// El servidor decide a quién escribirle y qué decirle. Desde acá solo se manda
// QUÉ pasó y SOBRE QUÉ, nunca un destinatario ni un texto.
export function avisar(
  tipo:
    | 'contrato_nuevo'
    | 'contrato_aceptado'
    | 'postulacion_nueva'
    | 'contenido_entregado'
    | 'cambios_pedidos',
  paraId: string,
  extra?: { titulo?: string | null; monto?: number | null; motivo?: string | null }
) {
  try {
    void fetch('/api/avisos', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ tipo, paraId, ...extra }),
    }).catch(() => {})
  } catch {}
}
