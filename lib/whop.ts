import Whop from "@whop/sdk";
import type { Currency } from "@whop/sdk/resources/shared";

// Cliente de Whop para la plataforma Octopus
// Documentación: https://docs.whop.com/developer/api/getting-started

if (!process.env.WHOP_API_KEY) {
  console.warn("WHOP_API_KEY no está configurada");
}

// Ambiente: "sandbox" o "production"
export const WHOP_ENVIRONMENT = process.env.WHOP_ENVIRONMENT || "production";
const isSandbox = WHOP_ENVIRONMENT === "sandbox";

// URL base según ambiente
const BASE_URL = isSandbox
  ? "https://api.whop.com/api/v1" // Sandbox usa misma URL pero con planes sandbox
  : "https://api.whop.com/api/v1";

export const whopClient = new Whop({
  apiKey: process.env.WHOP_API_KEY || "",
  baseURL: BASE_URL,
});

console.log(`[Whop] Ambiente: ${WHOP_ENVIRONMENT}`);

// ID de la compañía de Octopus en Whop (se configura después de crear cuenta)
export const OCTOPUS_COMPANY_ID = process.env.WHOP_OCTOPUS_COMPANY_ID || "";

// Porcentaje de comisión de Octopus (7%)
export const OCTOPUS_FEE_PERCENT = 0.07;

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
