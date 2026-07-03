// Parámetros de los planes de empresa — fuente única de verdad.
// Los límites y comisiones se leen desde acá en toda la app.

export type PlanKey = 'starter' | 'pro' | 'scale' | 'enterprise'

export interface Plan {
  key: PlanKey
  name: string
  monthly: number | null   // null = "Hablemos"
  feePercent: number       // comisión al depositar
  maxCampaigns: number     // campañas creadas totales (-1 = ilimitado)
  maxFeedCampaigns: number // campañas publicadas en el feed (-1 = ilimitado)
  maxHires: number         // creadores contratados (-1 = ilimitado)
  seats: number            // miembros del equipo (-1 = ilimitado)
  analytics: boolean
  support: string
}

export const PLANS: Record<PlanKey, Plan> = {
  starter: {
    key: 'starter', name: 'Starter', monthly: 0, feePercent: 7,
    maxCampaigns: 1, maxFeedCampaigns: 1, maxHires: 2, seats: 1,
    analytics: false, support: 'Chat',
  },
  pro: {
    key: 'pro', name: 'Pro', monthly: 99, feePercent: 4.7,
    maxCampaigns: 5, maxFeedCampaigns: 3, maxHires: -1, seats: 3,
    analytics: true, support: 'Prioritario',
  },
  scale: {
    key: 'scale', name: 'Scale', monthly: 499, feePercent: 2.3,
    maxCampaigns: 15, maxFeedCampaigns: 10, maxHires: -1, seats: 10,
    analytics: true, support: '24/7',
  },
  enterprise: {
    key: 'enterprise', name: 'Enterprise', monthly: null, feePercent: 0,
    maxCampaigns: -1, maxFeedCampaigns: -1, maxHires: -1, seats: -1,
    analytics: true, support: 'Manager dedicado',
  },
}

export function getPlan(key?: string | null): Plan {
  return PLANS[(key as PlanKey)] || PLANS.starter
}

// Comisión efectiva considerando un descuento porcentual del admin (ej. 20 = 20% off)
export function effectiveFee(plan: Plan, discountPercent = 0): number {
  const d = Math.max(0, Math.min(100, discountPercent))
  return Math.round(plan.feePercent * (1 - d / 100) * 100) / 100
}

export const isUnlimited = (n: number) => n < 0
export const limitLabel = (n: number) => (n < 0 ? 'Ilimitado' : String(n))
