'use client'

import { motion } from 'framer-motion'

// Transición suave entre pantallas (fade + subida leve), como una app nativa.
// template.tsx se re-monta en cada navegación dentro del grupo (app),
// mientras el layout (bottom bar) queda fijo.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 0.6, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
