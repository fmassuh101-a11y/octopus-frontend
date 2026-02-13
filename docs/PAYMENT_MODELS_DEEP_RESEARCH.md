# Deep Research: Payment Models for Creator Marketplaces

> **Research Date:** February 2026
> **Context:** Building a UGC creator marketplace based in Chile, serving LATAM creators, with companies paying for content. Requires escrow, multi-method payouts (crypto, PayPal, bank), and scalability.

---

## Table of Contents

1. [Part 1: How Whop Works (Sideshift Model)](#part-1-how-whop-works-sideshift-model)
2. [Part 2: Alternative Payment Models](#part-2-alternative-payment-models)
3. [Part 3: How Big Platforms Do It](#part-3-how-big-platforms-do-it)
4. [Part 4: The Ideal Model for a Creator Marketplace in LATAM](#part-4-the-ideal-model-for-a-creator-marketplace-in-latam)
5. [Recommendations & Architecture Decision](#recommendations--architecture-decision)

---

## Part 1: How Whop Works (Sideshift Model)

### What is Whop?

Whop is one of the fastest-growing commerce platforms for creators, focusing on giving creators everything they need to sell subscriptions, courses, communities, SaaS tools, eBooks, or digital downloads in one place. It powers payments for **27,000+ businesses** with true global reach: **195 countries, 135+ currencies, and 100+ payment methods**.

**Key Insight:** SideShift (the leading UGC platform) has joined the Whop payments network. SideShift has facilitated over **$10M in payouts to 10k+ college students**, now powered by Whop.

### 1. Is Whop the Merchant of Record?

**YES** - Whop acts as the Merchant of Record (MoR).

As your Merchant of Record, you'll get:
- **Automated tax calculation and remittance** for sales tax, VAT, and GST
- **Legal processing of transactions** on your behalf
- **Handling of VAT, GST, and sales tax collection** in over 100 jurisdictions
- **Chargeback protection** - If a chargeback happens, Whop's built-in Dispute Fighter automatically responds using real transaction evidence

> "Whop acts as your Merchant of Record, so it collects and remits VAT on digital sales in the UK and EU - this means you don't need to register for VAT yourself or manage tax calculations separately."

### 2. How Does Money Flow (Buyer -> Platform -> Creator)?

```
MONEY FLOW DIAGRAM:

[Buyer]
    |
    | Pays via credit card, PayPal, crypto, etc.
    v
[Whop Payment System]
    |
    | Multi-PSP orchestration routes to best provider
    | Lifts successful charges by 6-11%
    |
    v
[Whop as MoR]
    |
    | Deducts:
    | - Payment processing fee (2.7% + $0.30 domestic)
    | - Platform fee (3% for direct sales OR 30% if via Whop Discover)
    | - Taxes (collected and remitted automatically)
    |
    v
[Creator Balance in Whop]
    |
    | Creator chooses payout method
    v
[Payout to Creator]
    - ACH (bank deposit)
    - Crypto (Bitcoin, stablecoins)
    - Venmo / CashApp
    - PayPal
    - Local bank rails (241+ territories)
```

### 3. Whop Fee Structure

| Fee Type | Amount | Notes |
|----------|--------|-------|
| **Platform Fee** | 3% | Only on sales with automations (Discord, Telegram, etc.) |
| **Marketplace Commission** | 30% | If sale comes via Whop Discover |
| **Payment Processing** | 2.7% + $0.30 | Domestic cards |
| **International Cards** | +1.5% | Additional surcharge |
| **Currency Conversion** | +1% | If conversion required |
| **Enterprise Rates** | Custom | Available at $50K+/month volume |

**Comparison Context:**
- Gumroad: 10% flat fee (30% on referred sales)
- Patreon: 10% flat fee
- Whop: 3% (or 30% via Discover) - significantly lower for direct sales

### 4. How Whop Handles Key Operations

#### KYC for Creators
- Creators must complete **identity verification** and compliance checks
- Uses third-party identity verification services and financial partners
- Whop has built its own infrastructure: "When we started, Whop Payments was essentially a Stripe Connect wrapper. Now we've built our own infrastructure, from KYC to pay-ins and payouts."
- If KYC fails or is withdrawn, payouts are suspended or account terminated

#### Disputes/Chargebacks
- **Resolution Center**: Customers can request refunds without going to bank
- **Dispute Fighter**: Automatically uploads customer access logs, TOS, refund policy, and relevant info
- **7-day window**: If not resolved, customer can escalate to Whop review
- **Reserves**: May place reserves on high-risk accounts based on Dispute Risk Score
- **Risk Score > 5**: Account suspended, funds held 90+ days
- **Early Dispute Alerts**: $29 fee per alert to catch disputes before they become chargebacks
- **Industry standard**: Merchants win only 20-40% of chargeback cases

#### Tax Reporting (1099s)
- Whop is the Merchant of Record and Deemed Supplier for all transactions
- Handles collection and remittance of US sales tax, GST, and VAT
- **Currently does NOT send tax forms to creators outside the US**
- For US creators, appropriate tax forms are handled through the platform

#### International Payouts
- **241+ territories** supported
- **Payout methods**: ACH, local bank rails, PayPal, Bitcoin, stablecoins, Venmo, CashApp, wires
- **Same-day payouts** often available
- **Preferred currency** when possible

### 5. Can You Use Whop ONLY for Payouts?

**YES** - Whop's API supports using it as a payout-only service.

From the documentation:
> "The API system handles the entire payment lifecycle of your business, whether you're running your business on Whop or **using it as a payments service**."

**Key capabilities:**
- Programmatically send payouts via API
- Handle KYC through API integration
- Redirect creators to Whop's KYC portal
- Receive webhooks when KYC is complete
- Process payouts to creator's preferred method

### 6. How to Integrate Whop as a Payout Provider

#### Available SDKs:
- **JavaScript/TypeScript**: `npm install @whop/sdk`
- **Python**: `pip install whop-sdk`
- **Ruby**: `gem install whop_sdk`

#### API Key Types:
1. **Company API Key**: For accessing your company data
2. **App API Key**: For accessing data across all companies using your Whop apps

#### Integration Flow for Creator Payouts:

```javascript
// 1. Creator signs up on your platform
// 2. Redirect to Whop KYC onboarding
// Example: Create onboarding route in app/api/creator/onboarding/route.ts

// 3. Creator completes KYC on Whop's portal
// 4. Redirect back with ?onboarding=complete
// 5. Mark creator as onboarded in your database
// 6. Use Whop API to send payouts

// Best practice: Set weekly auto-withdrawals for cash predictability
```

---

## Part 2: Alternative Payment Models

### A. Stripe Connect Models

Stripe Connect is the industry standard for platform/marketplace payments, with three distinct charge types and three account types.

#### Charge Types Comparison

| Feature | Direct Charges | Destination Charges | Separate Charges & Transfers |
|---------|---------------|---------------------|------------------------------|
| **Charge Created On** | Connected account | Platform | Platform |
| **Best For** | SaaS platforms (Shopify) | Marketplaces (Airbnb, Lyft) | Complex multi-party splits |
| **Dispute Liability** | Connected account | Platform | Platform |
| **Multiple Recipients** | No | No | **Yes** |
| **Stripe Fees** | Connected account's plan | Platform's plan | Platform's plan |
| **Money Flow** | Never touches platform | Through platform | Through platform, split later |

#### Direct Charges (Money NEVER Touches Your Account)
- Payment appears on connected account, not platform
- Connected account responsible for Stripe fees, refunds, chargebacks
- **Use case**: SaaS platforms like Shopify, Thinkific
- Greater risk of negative balances on connected accounts

#### Destination Charges (Most Common for Marketplaces)
- Creates charge AND transfer in one API call (atomic transaction)
- Platform can independently reverse transfers
- Platform responsible for fees, refunds, chargebacks
- **Use case**: Airbnb, Lyft

#### Separate Charges and Transfers (Maximum Flexibility)
- Transfer and charge amounts don't have to match
- Can split single charge between multiple recipients
- Can delay transfers (useful for escrow-like behavior)
- **Use case**: Restaurant delivery (pay restaurant + driver from one charge)

#### Account Types Comparison

| Feature | Standard | Express | Custom |
|---------|----------|---------|--------|
| **Dashboard Access** | Full Stripe Dashboard | Express Dashboard (limited) | None |
| **Platform Control** | Minimal | Moderate | Full (white-label) |
| **Onboarding** | Self-service via Stripe | Stripe-hosted, customizable | Platform-built |
| **Fraud/Dispute Liability** | Connected account | Platform | Platform |
| **Integration Effort** | Minimal | Moderate | Significant |
| **Monthly Fee** | None | $2/active account | $2/active account |
| **Payout Fee** | Standard | 0.25% + $0.25 | 0.25% + $0.25 |

#### How to Set Up So Money NEVER Touches Your Account

Use **Direct Charges with Standard Accounts**:

```javascript
// Direct charge - funds go directly to connected account
const charge = await stripe.charges.create({
  amount: 10000,
  currency: 'usd',
  source: 'tok_visa',
  application_fee_amount: 300, // Your platform fee (3%)
}, {
  stripeAccount: 'acct_connected_account_id', // Connected account
});
```

With this approach:
- Funds land in connected account's balance
- Your platform only receives the application fee
- Connected account handles disputes/chargebacks
- Less regulatory burden on your platform

### B. Merchant of Record Services

#### Paddle

**Overview**: Robust solution for larger SaaS companies, handles everything from payments to compliance.

| Feature | Details |
|---------|---------|
| **Target** | SaaS companies, enterprises |
| **MoR Services** | Full tax compliance, fraud, chargebacks |
| **Subscription Management** | Advanced tools, churn reduction |
| **Security** | PCI-DSS Level 1, tokenization, E2E encryption |
| **B2B** | Global invoicing features |
| **Pricing** | Custom quotes required |

**Strengths**: Superior subscription billing, comprehensive global tax management, powerful B2B invoicing

**Weaknesses**: Overkill for non-SaaS, complex for smaller creators

#### Lemon Squeezy

**Overview**: Simple, creator-focused platform for digital products with elegant UI.

| Feature | Details |
|---------|---------|
| **Target** | Small businesses, creators, solopreneurs |
| **MoR Services** | Full tax compliance, payments |
| **Pricing** | 5% + $0.50 per transaction |
| **International** | +1.5% additional |
| **Features** | Affiliate tracking, subscription billing, license keys |
| **API** | Well-documented, easy to implement |

**Strengths**: Best UX (higher conversion rates), simple setup, good for digital products

**Weaknesses**: Acquired by Stripe (July 2024) - future uncertain, developing feature set

#### FastSpring

**Overview**: Enterprise-grade MoR for software, games, and SaaS.

| Feature | Details |
|---------|---------|
| **Target** | Software, SaaS, gaming companies |
| **Coverage** | 240+ countries/territories |
| **MoR Services** | Full tax, compliance, chargebacks |
| **Pricing** | Revenue-sharing (~6% estimated, custom quotes) |
| **Features** | Intelligent Payment Routing, subscription management |
| **Special** | Chargeback Overview Dashboard |

**Key Differentiator**: "FastSpring is essentially buying your product from you, then reselling it to your customer" - complete legal separation.

#### How MoRs Differ from Whop

| Aspect | Whop | Paddle/Lemon Squeezy/FastSpring |
|--------|------|----------------------------------|
| **Primary Focus** | Creators, digital products | SaaS, software |
| **Fee Structure** | 3% + processing | 5-6%+ all-inclusive |
| **Marketplace** | Yes (Whop Discover) | No built-in marketplace |
| **Payout Methods** | Crypto, ACH, Venmo, etc. | Traditional mostly |
| **Creator Tools** | Community, Discord, etc. | Limited |
| **Global Payouts** | 241+ territories | Varies |

### C. Payout-Only Services

These services ONLY handle payouts - you collect payments yourself and use these for disbursements.

#### Trolley (formerly Payment Rails)

**Best for**: Creator/influencer platforms, marketplaces

| Feature | Details |
|---------|---------|
| **Coverage** | 210+ countries, 135+ currencies |
| **Payment Methods** | Bank, e-wallets, PayPal, Venmo, wires, checks |
| **Tax Compliance** | W-9/W-8 collection, 1099/1042-S e-filing |
| **Compliance** | DAC7, OECD (EU, UK, AUS, NZ, CAN) |
| **Pricing** | $49/month (Standard Pay) + transaction fees |
| **Integration** | Direct funding from Stripe, Adyen, etc. |

**Unique Feature**: Can fund payouts directly from payment processor (Stripe, Checkout.com, etc.) - eliminates 1-3 business days from cycle.

#### Tipalti

**Best for**: Mid-market to enterprise, complex supplier relationships

| Feature | Details |
|---------|---------|
| **Coverage** | 200+ countries, 120 currencies |
| **Features** | AP automation, multi-entity, advanced FX |
| **FX** | Currency conversion, hedging, payee FX |
| **Compliance** | Advanced tax compliance |
| **Pricing** | $10,000+/month minimum, custom contracts |
| **Implementation** | Months-long process |

**Strengths**: Enterprise-grade, advanced FX capabilities
**Weaknesses**: Expensive, long implementation

#### Dots

**Best for**: Gig economy, creator platforms, marketplaces

| Feature | Details |
|---------|---------|
| **Coverage** | 150+ currencies, 190+ countries |
| **Payment Rails** | ACH, RTP, FedNow, PayPal, Venmo, Cash App, UPI, PIX, SEPA |
| **Instant Payouts** | Yes - real-time rails available |
| **Tax Compliance** | W-9/W-8BEN collection, TIN verification, 1099 filing |
| **Integration** | Under 2 hours with pre-built components |
| **Pricing** | Flat fee + % per transaction (custom quotes) |

**Standout Stats**:
- 31% increase in creator signup conversion
- 2-3x faster payment processing than Stripe (per customer quotes)
- Sandbox mode for testing

#### Hyperwallet (PayPal Service)

**Best for**: Enterprise marketplaces, gig economy at scale

| Feature | Details |
|---------|---------|
| **Coverage** | 200+ countries |
| **Payment Methods** | PayPal, Venmo, ACH, check, debit, prepaid card, eGift, cash pickup |
| **Limitation** | SMBs only get PayPal/Venmo; other methods enterprise-only |
| **Storage Fee** | $2.95/month if funds not cashed out in 90 days |
| **Integration** | Months for enterprise |

**Weaknesses**: Rigid, locked into PayPal ecosystem, no built-in compliance, no ERP integrations

#### Comparison Summary

| Service | Best For | Coverage | Key Strength | Key Weakness |
|---------|----------|----------|--------------|--------------|
| **Trolley** | Creators, influencers | 210+ countries | Direct processor funding | Slower payment speed |
| **Tipalti** | Enterprise | 200+ countries | Advanced FX, AP automation | Expensive, long setup |
| **Dots** | Gig/creator platforms | 190+ countries | Fast integration, instant payouts | Less established |
| **Hyperwallet** | Enterprise marketplaces | 200+ countries | PayPal ecosystem | SMB limitations, rigid |

### D. Hybrid Payment Models

#### Model 1: Collect with Stripe -> Payout with Whop

```
[Company/Buyer]
    |
    | Pays via Stripe (your existing integration)
    v
[Your Platform Stripe Account]
    |
    | You control escrow/hold funds
    v
[Transfer to Whop]
    |
    | Whop handles creator KYC
    | Whop handles global payouts
    v
[Creator receives via preferred method]
    - Crypto, bank, Venmo, etc.
```

**Pros**:
- Leverage existing Stripe setup
- Use Whop's 241+ territory payout network
- Whop handles creator compliance/KYC
- Multiple payout methods for creators

**Cons**:
- Two systems to manage
- Potentially higher total fees
- Need to transfer funds between systems

#### Model 2: Collect with Stripe -> Payout with Trolley

```
[Company/Buyer]
    |
    | Pays via Stripe
    v
[Stripe Account]
    |
    | Direct settlement to Trolley (no bank hop)
    v
[Trolley]
    |
    | Handles tax compliance (1099, W-8/W-9)
    | Handles identity verification
    v
[Creator receives payout]
    - Bank, PayPal, Venmo, wire
```

**Pros**:
- Eliminates bank account hop (1-3 days faster)
- Trolley handles tax forms automatically
- Strong compliance features

**Cons**:
- Payment speed not as fast as competitors
- Monthly fee ($49+)

#### Model 3: Collect with MercadoPago (LATAM) -> Payout with Crypto/Whop

```
[LATAM Company/Buyer]
    |
    | Pays via MercadoPago (local payment methods)
    v
[Your MercadoPago Account]
    |
    | Split payment: marketplace_fee for you
    | Remainder held for creator
    v
[Transfer to Whop or Crypto]
    |
    | Convert to USDT for stability
    v
[Creator receives]
    - Crypto (USDT) or local bank
```

**Pros**:
- Best LATAM payment method support
- Protects against currency volatility
- Appeals to crypto-native creators

**Cons**:
- Complex multi-system integration
- Currency conversion costs
- Regulatory considerations

#### Best Combination Recommendation

For a **LATAM-based UGC marketplace**:

**PRIMARY RECOMMENDATION:**
```
COLLECTION: Stripe (global) + MercadoPago (LATAM)
PAYOUTS: Whop OR Dots
ESCROW: Built on Stripe Connect with manual payouts
```

**WHY:**
1. Stripe: Best global coverage, proven reliability
2. MercadoPago: Essential for LATAM buyers (local payment methods)
3. Whop/Dots: Best creator payout options (crypto, instant, global)
4. Stripe manual payouts: Native escrow-like functionality

---

## Part 3: How Big Platforms Do It

### How SideShift Handles Payments

**SideShift** is the world's leading UGC Creator Marketplace, connecting brands with creators.

#### Payment Processing
- **Primary**: Stripe to process payments
- **Creator Payouts**: Stripe Connect for creator payouts
- **KYC**: Creators must complete Stripe Connect onboarding
- **Recent Partnership**: Joined Whop payments network for enhanced payout options

#### Accepted Payment Methods (for Brands)
- Visa, Mastercard, American Express
- Stripe/Link (Bank Accounts)
- ACH

#### Strict Payment Policy
> "All payments must be processed exclusively through the SideShift Platform. Users are strictly prohibited from facilitating payments through external channels (Venmo, PayPal, Cash App, ACH, checks, direct bank transfers) unless on 'Scale' plan or explicitly authorized."

#### Business Model
| Plan | Price | Features |
|------|-------|----------|
| Starter | $199/month | Up to 4 hires |
| Growth | $299/month | Mid-sized teams |
| Scale | $999/month | Unlimited hires, boosted visibility |
| White Glove | $20,000+/month | Fully managed solution |

### How Fiverr Handles Payments

**Fiverr** is a fixed-price gig marketplace for quick-turnaround creative work.

#### Payment Flow
```
1. BUYER PAYMENT
   - Pays upfront for pre-defined service packages (gigs)
   - 5.5% buyer fee + $3 "Small Order Fee" if under $100

2. ESCROW HOLDING
   - Money immediately deducted from buyer
   - Held in escrow until order completed
   - Seller does NOT receive during work period

3. ORDER COMPLETION
   - Seller delivers work
   - Buyer has 3 days to accept or request revisions
   - Auto-completed after 3 days if no response

4. CLEARING PERIOD
   - Top-rated sellers: 7 days
   - Regular sellers: 14 days

5. SELLER RECEIVES
   - Fiverr takes 20% commission
   - Payout via PayPal, bank transfer, or Fiverr Revenue Card
```

#### Key Policies
- **Commission**: Flat 20% on all earnings
- **Escrow**: Funds held until work approved
- **Clearing**: 7-14 day wait after completion

### How Upwork Handles Payments

**Upwork** supports both fixed-price and hourly projects with sophisticated payment protection.

#### Fixed-Price Projects (Escrow Model)
```
1. MILESTONE FUNDING
   - Client deposits money before work begins
   - Funds held in "project funds" (formerly escrow)

2. NEUTRAL HOLDING
   - Money sits securely while work in progress
   - Freelancer sees "Funded" label before starting

3. WORK SUBMISSION
   - Freelancer uses "Submit Work for Payment" button
   - Triggers 14-day countdown for automatic payment

4. APPROVAL/AUTO-RELEASE
   - Client approves: immediate release
   - No response: auto-released after 14 days
```

#### Hourly Projects
```
1. TIME TRACKING
   - Freelancer uses Upwork Desktop App
   - Logs hours with periodic screenshots ("Work Diary")

2. WEEKLY INVOICING
   - Every Monday, automatic invoice for previous week
   - Predictable cash flow for freelancers
```

#### Fee Structure
- **Freelancer fee**: Sliding scale based on lifetime billings with client
  - 20% for first $500
  - 10% for $500-$10,000
  - 5% for $10,000+

### How Patreon Handles Payments

**Patreon** is a membership/subscription platform for creators.

#### Merchant of Record Status
**Patreon = Merchant of Record**
> "Creators create the goods, but Patreon manages the actual exchange, thus making them the merchant."

#### Billing Models
1. **Subscription (Default)**: Members pay on signup, then monthly on same date
2. **Per Creation (Legacy)**: Pay per paid post (with monthly maximum)
3. **Annual**: Upfront payment for full year access

#### Fee Structure
| Fee Type | Amount |
|----------|--------|
| Platform Fee (Standard plan) | 10% |
| Platform Fee (Legacy plans) | 5%, 8%, or 11% |
| Payment Processing | ~2.9% + $0.30 |
| Apple In-App | 30% (if through iOS) |
| Payout Fee | Varies by method |

#### Payout Methods
- PayPal
- Bank transfer
- Payoneer
- Various regional options

### Platform Comparison Summary

| Platform | MoR? | Escrow? | Commission | Clearing Time | Payout Methods |
|----------|------|---------|------------|---------------|----------------|
| **SideShift** | Via Whop | N/A (B2B) | Plan-based | Via Stripe Connect | Stripe Connect + Whop |
| **Fiverr** | Yes | Yes | 20% | 7-14 days | PayPal, Bank, Card |
| **Upwork** | Yes | Yes (Fixed-Price) | 5-20% sliding | 14 days | PayPal, Bank, Wire |
| **Patreon** | Yes | No | 5-11% | Immediate (pending processing) | PayPal, Bank, Payoneer |

---

## Part 4: The Ideal Model for a Creator Marketplace in LATAM

### Your Requirements Analyzed

| Requirement | Challenge | Solution Needed |
|-------------|-----------|-----------------|
| Based in Chile | Limited local MoR options | Global provider with LATAM support |
| Creators worldwide (mainly LATAM) | Multi-currency, diverse payout needs | Flexible payout system |
| Companies paying for UGC | B2B invoicing, reliable collection | Strong payment collection |
| Need escrow | Hold until content approved | Manual transfer control |
| Multi-method payouts | Crypto, PayPal, bank | Diverse payout provider |
| Avoid regulatory issues | Money transmission, licensing | MoR or proper structuring |
| Scale to millions | Infrastructure, compliance | Enterprise-ready systems |

### LATAM Market Context

#### Chile Crypto/Fintech Landscape
- Chile contributed **$23.8 billion** in crypto transaction volume
- Stablecoin adoption soaring due to inflation and currency controls
- **Fintech Law (Law No. 21.521)** outlines digital asset guidelines
- **Orionx**: Chilean exchange with Tether investment (2025)
- **Visa**: Launched stablecoin payments in Chile (2025)
- Local banks like **BCI** supporting USDT transactions

#### LATAM Payment Methods
- **MercadoPago**: Leader in prepaid cards in Chile
- Local bank transfers essential
- High mobile wallet adoption
- Growing crypto/stablecoin usage

### Recommended Architecture

#### Option A: Full Whop Integration (Simplest)

```
                    ┌─────────────────────────────────────┐
                    │           YOUR PLATFORM             │
                    │         (App, Website)              │
                    └─────────────────────────────────────┘
                                    │
                                    │ API Integration
                                    ▼
                    ┌─────────────────────────────────────┐
                    │              WHOP                   │
                    │  - Merchant of Record               │
                    │  - Payment collection               │
                    │  - Creator KYC                      │
                    │  - Tax compliance                   │
                    │  - Dispute handling                 │
                    │  - Global payouts (241+ countries)  │
                    │  - Crypto payouts                   │
                    └─────────────────────────────────────┘
                          │                    │
                          ▼                    ▼
                   [Companies Pay]      [Creators Receive]
                   - Cards              - Crypto (USDT, BTC)
                   - PayPal             - Bank transfer
                   - Crypto             - PayPal
                   - etc.               - Venmo/CashApp
```

**Pros**:
- Single integration
- Whop handles everything (MoR, compliance, payouts)
- 3% fee (low)
- Crypto payouts built-in
- SideShift uses this model

**Cons**:
- Less control over payment flow
- Dependent on single provider
- Limited LATAM-specific payment methods

**Best for**: MVP, rapid launch, lower volume

---

#### Option B: Stripe + Whop Hybrid (Recommended for Scale)

```
┌─────────────────────────────────────────────────────────────┐
│                      YOUR PLATFORM                          │
│                   (App, Website, API)                       │
└─────────────────────────────────────────────────────────────┘
            │                                    │
            │ Payment Collection                 │ Creator Payouts
            ▼                                    ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│    STRIPE CONNECT       │         │         WHOP            │
│  - Destination Charges  │         │  - Creator KYC          │
│  - Manual Payouts       │  ────>  │  - Tax compliance       │
│  - Escrow-like holds    │ Funds   │  - Global payouts       │
│  - Platform control     │         │  - Crypto support       │
└─────────────────────────┘         └─────────────────────────┘
            │                                    │
            ▼                                    ▼
     [Companies Pay]                      [Creators Receive]
     - Stripe (global)                    - Crypto (USDT, BTC)
     - Link/ACH                           - Local bank
     - Cards                              - PayPal
                                          - Venmo/CashApp

LATAM ENHANCEMENT:
┌─────────────────────────┐
│     MERCADOPAGO         │
│  - Local payment methods │
│  - Chilean Peso (CLP)   │
│  - Installments         │
└─────────────────────────┘
```

**Escrow Implementation with Stripe:**
```javascript
// 1. Create charge with manual payout schedule
const connectedAccount = await stripe.accounts.create({
  type: 'express', // or 'custom' for full control
  settings: {
    payouts: {
      schedule: {
        interval: 'manual' // YOU control when funds release
      }
    }
  }
});

// 2. Collect payment from company
const paymentIntent = await stripe.paymentIntents.create({
  amount: 50000, // $500
  currency: 'usd',
  application_fee_amount: 5000, // Your 10% fee
  transfer_data: {
    destination: connectedAccount.id,
  },
});

// 3. Content delivered and approved - trigger payout
// (Up to 90 days later)
const payout = await stripe.payouts.create({
  amount: 45000,
  currency: 'usd',
}, {
  stripeAccount: connectedAccount.id,
});

// 4. Or transfer to Whop for diverse payout methods
// Use Whop API to send payout
```

**Pros**:
- Full escrow control
- Best global payment collection (Stripe)
- Best global payouts (Whop)
- MercadoPago for LATAM buyers
- Crypto payouts
- Scalable infrastructure

**Cons**:
- Two integrations to maintain
- Higher complexity
- Must manage fund transfers between systems

**Best for**: Growing platform, need for escrow, scale

---

#### Option C: Full Stripe Connect with Dots (Maximum Control)

```
┌─────────────────────────────────────────────────────────────┐
│                      YOUR PLATFORM                          │
│                   (Full control, MoR-like)                  │
└─────────────────────────────────────────────────────────────┘
            │                                    │
            │ Payment Collection                 │ Payouts
            ▼                                    ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│    STRIPE CONNECT       │         │         DOTS            │
│  (Separate Charges      │ Direct  │  - Fast integration     │
│   & Transfers)          │ ─────>  │  - 1099 tax filing      │
│  - Full escrow control  │ Fund    │  - RTP/FedNow instant   │
│  - Split payments       │         │  - PayPal, Venmo        │
│  - Multiple recipients  │         │  - Crypto planned       │
└─────────────────────────┘         └─────────────────────────┘
```

**Pros**:
- Maximum flexibility in payment splits
- Instant payouts (RTP, FedNow)
- Automated tax compliance
- Fast integration (2 hours claimed)

**Cons**:
- YOU bear more regulatory responsibility
- No MoR protection
- Must handle more compliance yourself

**Best for**: Technical teams, need for complex splits

---

### Regulatory Considerations

#### Understanding Your Options

| Model | Regulatory Burden | Your Responsibility |
|-------|-------------------|---------------------|
| **Full MoR (Whop/Paddle)** | Low | Minimal - MoR handles everything |
| **Stripe + MoR Payouts** | Medium | Collection compliance, MoR handles payouts |
| **Pure Stripe Connect** | Medium-High | Platform responsibility for disputes |
| **Self-built** | Very High | Everything: licensing, compliance, tax |

#### Chile-Specific Considerations
- **Fintech Law (No. 21.521)**: Regulates digital assets, financial tech
- Cryptocurrency not legal tender but allowed for payments
- Money transmission may require specific licensing
- Consider establishing legal entity structure carefully

#### Avoiding Money Transmission Issues

**Best practice**: Use a Merchant of Record (Whop, Paddle) for at least the payout side:
- MoR is the legal seller, not you
- MoR handles regulatory compliance
- You're a "software platform" not a "money transmitter"

### Final Recommendation

#### For Your Specific Case (Chile-based UGC Marketplace, LATAM Creators):

**PHASE 1: MVP Launch**
```
USE: Whop Full Integration

- Single integration
- Whop = MoR (compliance handled)
- Global payouts including crypto
- Quick to market
- 3% + processing fees
```

**PHASE 2: Growth (Post-PMF)**
```
USE: Stripe + Whop Hybrid

Collection:
- Stripe Connect (Destination Charges)
- MercadoPago (LATAM local methods)
- Manual payout scheduling (escrow)

Payouts:
- Whop for diverse methods
- Crypto for LATAM creators (USDT stability)

Your Role:
- Control approval flow
- Manage escrow timing
- Own the customer relationship
```

**PHASE 3: Scale (Millions)**
```
USE: Custom Stack

- Stripe Connect (core collection)
- MercadoPago (LATAM)
- Multiple payout providers for redundancy
- Consider becoming MoR (with proper licensing)
- Regional payment method optimization
- Advanced fraud/risk systems
```

### Cost Comparison

| Setup | Collection Cost | Payout Cost | Total (on $1000) |
|-------|-----------------|-------------|------------------|
| **Whop Only** | 2.7% + $0.30 + 3% | Included | ~$60 |
| **Stripe + Whop** | 2.9% + $0.30 + 0.25% | 2.7% + $0.30 | ~$60-70 |
| **Stripe + Trolley** | 2.9% + $0.30 | $49/mo + fees | Variable |
| **Stripe + Dots** | 2.9% + $0.30 | Custom % | Variable |

---

## Recommendations & Architecture Decision

### Summary Decision Matrix

| If You Need... | Use This |
|----------------|----------|
| Fastest to market | Whop |
| Best LATAM support | Stripe + MercadoPago + Whop |
| Maximum escrow control | Stripe Connect (manual payouts) |
| Best crypto payouts | Whop or Dots |
| Enterprise tax compliance | Trolley or Tipalti |
| Lowest fees | Stripe Connect Direct Charges |
| MoR protection | Whop, Paddle, or Lemon Squeezy |

### Key Takeaways

1. **SideShift Model Works**: They use Stripe + Whop. This is proven at scale ($10M+ payouts).

2. **Whop is the Best Payout Option** for creator platforms:
   - 241+ territories
   - Crypto built-in
   - Low fees
   - MoR protection

3. **Escrow is Achievable** with Stripe Connect:
   - Manual payout scheduling
   - Up to 90-day holds
   - Platform controls release

4. **LATAM Requires MercadoPago**: Essential for local payment methods in Chile and region.

5. **Crypto is Important** for LATAM creators:
   - USDT provides stability vs local currency volatility
   - Growing adoption in Chile
   - Visa/Tether investments in region

6. **Start Simple, Scale Complex**: Begin with Whop, add Stripe/MercadoPago as you grow.

---

## Sources & References

### Whop & Payments
- [Whop Fees Documentation](https://docs.whop.com/fees)
- [Whop Payments Blog](https://whop.com/blog/payments-launch/)
- [Whop API Documentation](https://docs.whop.com/developer/api/getting-started)
- [Whop Disputes & Chargebacks](https://help.whop.com/en/articles/10971072-understanding-disputes-risk-scores-reserves-and-account-actions)

### Stripe Connect
- [Stripe Connect Charges Documentation](https://docs.stripe.com/connect/charges)
- [Stripe Account Types](https://docs.stripe.com/connect/accounts)
- [Stripe Manual Payouts](https://docs.stripe.com/connect/manual-payouts)

### Merchant of Record
- [Paddle vs Lemon Squeezy](https://www.paddle.com/compare/lemon-squeezy)
- [FastSpring MoR](https://fastspring.com/merchant-of-record/)
- [MoR vs PayFac Comparison](https://payproglobal.com/comparisons/merchant-of-record-vs-payment-facilitator/)

### Payout Services
- [Trolley for Marketplaces](https://trolley.com/use-cases/marketplaces/)
- [Dots Payout API](https://usedots.com/)
- [Tipalti Alternatives Comparison](https://tipalti.com/resources/learn/trolley-competitors-and-alternatives/)

### Platform Research
- [SideShift](https://sideshift.app/)
- [Fiverr Payment Process](https://community.fiverr.com/public/blogs/buyers-guide-understanding-fiverrs-payment-process-2025-05-30/)
- [Upwork Payment Protection](https://support.upwork.com/hc/en-us/articles/211063748-How-Fixed-Price-Payment-Protection-works-for-freelancers-on-Upwork)
- [Patreon Fees](https://support.patreon.com/hc/en-us/articles/11111747095181-Creator-fees-overview)

### LATAM Payments
- [MercadoPago Marketplace Integration](https://www.mercadopago.cl/developers/en/docs/checkout-api-payments/how-tos/integrate-marketplace)
- [USDT in Chile](https://www.transfi.com/blog/usdt-payout-and-collection-in-chile---banco-de-credito-e-inversiones-and-local-bank-transfers)
- [LATAM Crypto 2025 Report](https://dune.com/blog/latam-crypto-2025-report)

---

*Document generated: February 2026*
*For the Octopus UGC Creator Marketplace*
