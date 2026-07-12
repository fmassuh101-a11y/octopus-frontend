import Whop from "@whop/sdk";
import type { Currency } from "@whop/sdk/resources/shared";

// Cliente de Whop para la plataforma Octopus
// Documentación: https://docs.whop.com/developer/api/getting-started

// Credenciales de PRUEBA (sandbox.whop.com). Convención de Felipe en Vercel:
// WHOP_API_KEY_Test / WHOP_OCTOPUS_COMPANY_ID_test — si existen, la app entra en
// modo SANDBOX automáticamente (plata falsa, tarjetas 4242). Para volver a
// producción: borrar las variables _Test en Vercel y redeploy. Las de producción
// (WHOP_API_KEY / WHOP_OCTOPUS_COMPANY_ID) quedan intactas.
const TEST_KEY =
  process.env.WHOP_API_KEY_Test || process.env.WHOP_API_KEY_TEST || process.env.WHOP_API_KEY_test || "";
const TEST_COMPANY_ID =
  process.env.WHOP_OCTOPUS_COMPANY_ID_test || process.env.WHOP_OCTOPUS_COMPANY_ID_TEST || process.env.WHOP_OCTOPUS_COMPANY_ID_Test || "";

if (!process.env.WHOP_API_KEY && !TEST_KEY) {
  console.warn("WHOP_API_KEY no está configurada");
}

// Ambiente: SANDBOX solo si existen credenciales de test reales.
// Si no hay test keys, va a PRODUCCIÓN aunque quede WHOP_ENVIRONMENT=sandbox
// (evita el 401 "key de producción contra sandbox" al borrar solo las _Test).
const isSandbox = !!TEST_KEY;
export const WHOP_ENVIRONMENT = isSandbox ? "sandbox" : "production";

// URL base según ambiente (sandbox = mirror completo para probar sin plata real)
const BASE_URL = isSandbox
  ? "https://sandbox-api.whop.com/api/v1"
  : "https://api.whop.com/api/v1";

export const whopClient = new Whop({
  apiKey: (isSandbox && TEST_KEY ? TEST_KEY : process.env.WHOP_API_KEY) || "",
  baseURL: BASE_URL,
});

console.log(`[Whop] Ambiente: ${WHOP_ENVIRONMENT}`);

// ID de la compañía de Octopus en Whop (sandbox usa la compañía de test)
export const OCTOPUS_COMPANY_ID =
  (isSandbox && TEST_COMPANY_ID ? TEST_COMPANY_ID : process.env.WHOP_OCTOPUS_COMPANY_ID) || "";

// Porcentaje de comisión de Octopus (4.7%)
// Corte de Octopus: 3.7% para creadores NO-Pro, 0% para Pro (incentiva la suscripción).
// Se aplica UNA sola vez, AL RETIRAR — el creador ve su saldo completo hasta el cashout.
// Sin cargo fijo nuestro (Whop ya tiene el suyo); mínimo de retiro para proteger montos chicos.
export const OCTOPUS_FEE_PERCENT = 0.037;
export const MIN_WITHDRAW_USD = 20;
export function octopusFeePercent(isPro: boolean): number {
  return isPro ? 0 : OCTOPUS_FEE_PERCENT;
}
// Dado el monto de la campaña y si el creador es Pro, cuánto recibe y cuánto es el corte.
export function splitPayout(amount: number, isPro: boolean): { creator: number; fee: number } {
  const fee = Math.round(amount * octopusFeePercent(isPro) * 100) / 100;
  return { creator: Math.round((amount - fee) * 100) / 100, fee };
}

// Moneda por defecto
const DEFAULT_CURRENCY: Currency = "usd";

// Tipos para Whop
export interface WhopCompany {
  id: string;
  name: string;
  // otros campos según API
}

export interface WhopTransfer {
  id: string;
  amount: number;
  currency: string;
  origin_id: string;
  destination_id: string;
  status: string;
  created_at: string;
}

export interface WhopTopup {
  id: string;
  amount: number;
  currency: string;
  company_id: string;
  status: string;
}

export interface WhopWithdrawal {
  id: string;
  amount: number;
  currency: string;
  company_id: string;
  payout_method_id: string;
  status: string;
}

// ============================================
// FUNCIONES PARA EMPRESAS (Companies)
// ============================================

/**
 * Crear una Company en Whop para una empresa
 * Las empresas agregan fondos via Top-ups para pagar a creadores
 */
export async function createCompanyAccount(data: {
  name: string;
  email: string;
  userId: string; // ID de Supabase
}) {
  const company = await whopClient.companies.create({
    title: data.name,
    parent_company_id: OCTOPUS_COMPANY_ID,
    email: data.email,
    metadata: {
      octopus_user_id: data.userId,
      type: "company",
    },
  });

  return company;
}

/**
 * Crear una Company en Whop para un creador
 * Los creadores reciben pagos y retiran via portal de payouts
 */
export async function createCreatorAccount(data: {
  name: string;
  email: string;
  userId: string; // ID de Supabase
}) {
  const company = await whopClient.companies.create({
    title: data.name,
    parent_company_id: OCTOPUS_COMPANY_ID,
    email: data.email,
    metadata: {
      octopus_user_id: data.userId,
      type: "creator",
    },
  });

  return company;
}

// ============================================
// FUNCIONES PARA TOP-UPS (Empresas agregan fondos)
// ============================================

/**
 * Empresa agrega fondos a su balance
 * IMPORTANTE: Los Top-ups NO tienen fees
 */
export async function createTopup(data: {
  companyId: string;
  amount: number;
  currency?: Currency;
  paymentMethodId: string;
}) {
  const topup = await whopClient.topups.create({
    company_id: data.companyId,
    amount: data.amount,
    currency: data.currency || DEFAULT_CURRENCY,
    payment_method_id: data.paymentMethodId,
  });

  return topup;
}

/**
 * Obtener métodos de pago guardados de una empresa
 */
export async function getPaymentMethods(companyId: string) {
  const methods = await whopClient.paymentMethods.list({
    company_id: companyId,
  });

  return methods.data;
}

// ============================================
// FUNCIONES PARA TRANSFERS (Pagar a creadores)
// ============================================

/**
 * Transferir fondos de Octopus a un creador
 * Opción 1: Transferencia manual (calculamos el 7% nosotros)
 */
export async function transferToCreator(data: {
  creatorCompanyId: string;
  amount: number; // Monto ANTES de la comisión
  currency?: Currency;
  jobId: string;
  metadata?: Record<string, string>;
}) {
  const fee = data.amount * OCTOPUS_FEE_PERCENT;
  const creatorAmount = data.amount - fee;

  const transfer = await whopClient.transfers.create({
    amount: creatorAmount,
    currency: data.currency || DEFAULT_CURRENCY,
    origin_id: OCTOPUS_COMPANY_ID,
    destination_id: data.creatorCompanyId,
    idempotence_key: `payout_${data.jobId}_${Date.now()}`,
    metadata: {
      job_id: data.jobId,
      original_amount: String(data.amount),
      octopus_fee: String(fee),
      ...data.metadata,
    },
  });

  return {
    transfer,
    originalAmount: data.amount,
    fee,
    creatorAmount,
  };
}

/**
 * Crear checkout con comisión automática del 7%
 * Opción 2: Direct Charge (Whop maneja la comisión)
 */
export async function createCheckoutWithFee(data: {
  creatorCompanyId: string;
  amount: number;
  title: string;
  jobId: string;
  productId: string;
  currency?: Currency;
}) {
  const fee = data.amount * OCTOPUS_FEE_PERCENT;

  const checkout = await whopClient.checkoutConfigurations.create({
    plan: {
      company_id: data.creatorCompanyId,
      currency: data.currency || DEFAULT_CURRENCY,
      initial_price: data.amount,
      plan_type: "one_time",
      application_fee_amount: fee, // Nuestro 7%
      product_id: data.productId,
    },
    metadata: {
      job_id: data.jobId,
      title: data.title,
    },
  });

  return checkout;
}

// ============================================
// FUNCIONES PARA KYC Y ONBOARDING
// ============================================

/**
 * Generar link de onboarding KYC para creador
 * El creador completa verificación de identidad
 */
export async function createKYCOnboardingLink(data: {
  creatorCompanyId: string;
  returnUrl: string;
  refreshUrl: string;
}) {
  const accountLink = await whopClient.accountLinks.create({
    company_id: data.creatorCompanyId,
    use_case: "account_onboarding",
    return_url: data.returnUrl,
    refresh_url: data.refreshUrl,
  });

  return accountLink;
}

/**
 * Generar link al portal de payouts para creador
 * Donde configura métodos de retiro y retira fondos
 */
export async function createPayoutsPortalLink(data: {
  creatorCompanyId: string;
  returnUrl: string;
  refreshUrl: string;
}) {
  const accountLink = await whopClient.accountLinks.create({
    company_id: data.creatorCompanyId,
    use_case: "payouts_portal",
    return_url: data.returnUrl,
    refresh_url: data.refreshUrl,
  });

  return accountLink;
}

// ============================================
// FUNCIONES PARA WITHDRAWALS (Creador retira)
// ============================================

/**
 * Obtener métodos de payout de un creador
 */
export async function getPayoutMethods(creatorCompanyId: string) {
  const methods = await whopClient.payoutMethods.list({
    company_id: creatorCompanyId,
  });

  return methods.data;
}

/**
 * Crear withdrawal manual para creador
 * Normalmente el creador hace esto desde el portal
 */
export async function createWithdrawal(data: {
  creatorCompanyId: string;
  amount: number;
  currency?: Currency;
  payoutMethodId: string;
  platformCoversFees?: boolean;
}) {
  const withdrawal = await whopClient.withdrawals.create({
    company_id: data.creatorCompanyId,
    amount: data.amount,
    currency: data.currency || DEFAULT_CURRENCY,
    payout_method_id: data.payoutMethodId,
    platform_covers_fees: data.platformCoversFees || false,
  });

  return withdrawal;
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Calcular el desglose de un pago
 */
export function calculatePaymentBreakdown(amount: number) {
  const octopusFee = amount * OCTOPUS_FEE_PERCENT;
  const whopFee = amount * 0.027 + 0.30; // 2.7% + $0.30
  const creatorReceives = amount - octopusFee;

  return {
    total: amount,
    octopusFee: Math.round(octopusFee * 100) / 100,
    whopFee: Math.round(whopFee * 100) / 100,
    creatorReceives: Math.round(creatorReceives * 100) / 100,
  };
}
