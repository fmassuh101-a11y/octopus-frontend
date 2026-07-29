import { redirect } from 'next/navigation'

// Esta pantalla ya no existe: manda a la billetera.
//
// POR QUÉ SE BORRÓ
// Eran 262 líneas de datos completamente inventados, presentados al creador
// como si fueran suyos: "$28.943 de ganancias del año", "+45,8% de
// crecimiento", "98% de éxito", cinco transacciones falsas con fechas de 2024,
// tres pagos futuros por $7.800, y un gráfico cuyo propio código llevaba el
// comentario "Fake Chart Lines".
//
// Un creador recién registrado abría esto y veía casi treinta mil dólares de
// ganancias que nunca existieron. No es un detalle de maquetación: es la app
// mintiéndole sobre su propio dinero.
//
// No se rehízo con datos reales porque ya existe /creator/wallet, que lee el
// saldo de la cuenta de Whop del creador y su historial de movimientos. Tener
// dos pantallas de plata compitiendo fue justamente lo que dejó que una se
// llenara de invenciones sin que nadie lo notara.
//
// El menú inferior ya apuntaba a la billetera; esta ruta solo quedaba
// alcanzable escribiéndola a mano.

export default function GananciasRedirect() {
  redirect('/creator/wallet')
}
