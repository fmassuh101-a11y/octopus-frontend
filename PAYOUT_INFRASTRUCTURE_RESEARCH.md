# Payout Infrastructure Research: Whop & Alternatives

## Executive Summary

This document explores payout-as-a-service solutions for platforms that need to handle multi-method payouts (crypto + fiat) with built-in KYC/compliance. The discovery that **Sideshift uses Whop** for their payout infrastructure opens up interesting possibilities.

---

## 1. Whop for Platforms

### How Sideshift Uses Whop

Sideshift (the UGC/creator platform) uses Whop's payment infrastructure to handle:
- Balance reservations
- Withdrawal processing
- Multi-method payouts (Bitcoin, PayPal, Solana, Bank transfer)
- KYC/ID verification

Nick Lawton, CEO of SideShift, is featured as a testimonial on Whop's network page, confirming their partnership.

### Whop's Evolution

Whop has evolved from a "Stripe Connect wrapper" to building their own independent infrastructure:

> "When we started, Whop was essentially a Stripe Connect wrapper. Now we've built our own infrastructure, from KYC to pay-ins and payouts."
> — Hunter Dickinson, Head of Partnerships at Whop

**Key Stats:**
- Powers 27,000+ businesses worldwide
- Routes billions in transactions
- Increases successful charges by up to 11%
- Launched **Whop Payments** in September 2025

### Whop Payout Features

| Feature | Details |
|---------|---------|
| **Global Coverage** | 241+ territories |
| **Payout Methods** | ACH, Crypto (Bitcoin, stablecoins), Venmo, CashApp, PayPal, local bank transfers |
| **Payment Methods** | 100+ methods including cards, wallets, crypto, BNPL |
| **KYC/Compliance** | Built-in, fully managed |
| **White-Label** | Yes - zero redirects, complete branding control |
| **Tax Compliance** | Can act as merchant-of-record |

### Whop Pricing

| Fee Type | Amount |
|----------|--------|
| **Monthly Fee** | $0 (free to start) |
| **Transaction Fee** | 2.7% + $0.30 |
| **International Cards** | +1.5% |
| **Currency Conversion** | +1% |
| **Platform Commission** | 3% (only on automated sales via Discord, Telegram, etc.) |
| **Whop Discover Sales** | 30% commission |

### Whop API Capabilities

```
Base URL: https://api.whop.com/api/v1
Authentication: Bearer token in Authorization header
```

**SDKs Available:**
- JavaScript/TypeScript: `npm install @whop/sdk`
- Python: `pip install whop-sdk`
- Ruby: `gem install whop_sdk`

**API Features:**
- Accept payments programmatically
- Issue refunds
- Handle disputes
- Create invoices
- **Send payouts** (by Whop username, ID, or wallet)
- Store payment details on file
- Charge customers programmatically

### Whop for Platforms Integration

For platforms wanting to use Whop for sub-merchant payouts:
- Use Company API keys of the main "platform" company
- Handles payment processing, compliance, and payouts for multi-tenant applications
- Sub-merchants can enable free trials, monthly/annual billing, tiered pricing
- Split payments and multi-party payouts supported

**Recent B2B Partnership Example:**
- In December 2025, Whop became **micro1's official global payouts partner**, enabling instant payouts via Venmo, PayPal, stablecoins, and local bank transfers worldwide.

### How to Contact Whop for Platform Integration

- **Documentation**: https://docs.whop.com/developer/api/getting-started
- **Platform Docs**: https://docs.whop.com/supported-business-models/platforms
- **API Explorer**: Available in docs with "Try it" button
- **Website**: https://whop.com/sell/platform/

---

## 2. Alternatives to Whop

### Comparison Matrix

| Platform | Monthly Fee | Transaction Fee | Countries | Crypto Payouts | KYC Built-in | White-Label | Best For |
|----------|-------------|-----------------|-----------|----------------|--------------|-------------|----------|
| **Whop** | $0 | 2.7% + $0.30 | 241+ | Yes | Yes | Yes | Digital creators, SaaS |
| **Trolley** | $49 | Usage-based | 210+ | Limited | Yes | Yes | Creator/influencer platforms |
| **Tipalti** | $99+ | Custom | 200+ | Limited | Yes | Yes | Enterprise AP |
| **Hyperwallet** | Custom | Custom | 200+ | Via PYUSD | Yes | No (PayPal branded) | Large marketplaces |
| **Payoneer** | Varies | Per-transaction | 190+ | Limited | Yes | Partial | E-commerce marketplaces |
| **Dots** | Custom | Custom | 190+ | Yes (stablecoins) | Yes | Yes | Fast integration |
| **Rise** | $50/user or 3% | See left | 190+ | Yes (native) | Yes | Yes | Web3/crypto-native |

---

### 2.1 Trolley (formerly Payment Rails)

**Website**: https://trolley.com/

**Overview**: Purpose-built payout platform for the internet economy.

**Features:**
- Payouts to 210+ countries, 135+ currencies
- Payment methods: ACH, wire, PayPal, Venmo, local bank transfers
- 1099 and 1042-S e-filing built-in
- W-8, W-8 BEN, W-9 collection with validation
- DAC7 and OECD compliance (EU, UK, AUS, NZ, CAN)
- ~2% FX markup (lower than PayPal/Payoneer)
- Free trial + forever-free sandbox

**Pricing:**
- Starting at $49/month
- Transparent, usage-based pricing
- As low as $1 per transaction

**API**: REST API with extensive documentation at https://trolley.com/developers/

**Best For**: Creator/influencer platforms, music/streaming royalties, freelance platforms, ad networks

---

### 2.2 Tipalti

**Website**: https://tipalti.com/

**Overview**: Enterprise-grade finance automation and mass payments.

**Features:**
- 200+ countries, 120 currencies, 50+ payment methods
- Modern REST API
- Crypto payouts (Bitcoin, Ethereum mentioned)
- OFAC and sanctions list screening
- KPMG-certified tax engine
- $50B+ in annual payments processed
- Blue-chip bank partners: Citi, JP Morgan Chase, Wells Fargo

**Pricing:**
- Starting at $99/month
- High minimum commitments (~$10,000+/month typical)
- Custom quotes required
- No free trial

**API**: REST API with sandbox at https://tipalti.com/mass-payments/payout-api/

**Best For**: Mid-to-large enterprises with complex AP needs

---

### 2.3 Hyperwallet (PayPal Enterprise Payouts)

**Website**: https://www.hyperwallet.com/

**Overview**: Global payout infrastructure backed by PayPal's banking network.

**Features:**
- 200+ markets, 50+ currencies
- Payouts: bank accounts, debit cards, PayPal, Venmo, checks, prepaid cards, PYUSD crypto, eGift cards, cash pickup
- REST API with webhook notifications
- Embedded Payout Experience (drop-in UI components)
- Batch CSV upload option

**Limitations:**
- Forces PayPal-branded experience (not true white-label)
- Complex setup process
- Less comprehensive documentation

**Pricing**: Custom enterprise pricing

**API**: https://docs.hyperwallet.com/

**Best For**: Large enterprise marketplaces already using PayPal

---

### 2.4 Payoneer

**Website**: https://www.payoneer.com/

**Overview**: Global B2B payments and marketplace payouts.

**Features:**
- 190+ countries, 70 currencies
- Hold up to 30 currencies
- Bank accounts, Payoneer accounts, eWallets
- Up to 500 payments per single API call
- Real-time integration

**Payout Timing:**
- Payoneer accounts: within minutes
- Bank transfers: up to 3 business days

**API**: https://developer.payoneer.com/

**Best For**: E-commerce marketplaces, cross-border B2B

---

### 2.5 Dots (usedots.com)

**Website**: https://usedots.com/

**Overview**: Modern payouts engine built for speed and flexibility.

**Features:**
- 300+ payment rails: ACH, RTP, wire, PayPal, Venmo, UPI, PIX, SEPA Instant, mobile money, **stablecoins**
- 190+ countries, 135 currencies
- Integrate in under 2 hours
- Payout Links (no recipient onboarding required)
- Auto-validation of IBAN, routing, crypto addresses
- SOC 2 Type II certified, PCI-compliant vault
- TLS 1.3 encryption

**Unique Feature**: "Payout Links" - send money with just a link, recipients choose their payout method

**API**: https://usedots.com/platform/payouts-api/

**Best For**: Fast integration, creator royalties, contractor payments, live-stream payouts

---

### 2.6 Rise (Riseworks)

**Website**: https://www.riseworks.io/

**Overview**: Web3-native payroll and payout solution.

**Features:**
- 190+ countries
- Fiat, stablecoins, and cryptocurrency payouts
- One-time, milestone-based, or recurring payments
- Gnosis Safe, Coinbase, MetaMask integrations
- SOC 2 certified, GDPR compliant
- All users KYC-verified

**Unique**: RiseID smart contract system for payments

**Pricing**: $50 per contractor OR 3% of payment volume

**API**: https://docs.riseworks.io/

**Best For**: Web3-native platforms, crypto-first creator economies

---

## 3. Additional Specialized Providers

### Crypto-to-Fiat Specialists

| Provider | Focus | Website |
|----------|-------|---------|
| **Rail.io** | Fiat + Stablecoin hybrid | https://rail.io/ |
| **BVNK** | Stablecoin payouts | https://bvnk.com/payouts |
| **Transak** | Crypto off-ramp via Visa Direct | https://transak.com/ |
| **Request Finance** | Crypto-to-fiat invoicing | https://www.request.finance/ |
| **Swapin** | EU-licensed crypto payments | https://www.swapin.com/ |
| **MoonPay** | Crypto buy/sell/payout | https://www.moonpay.com/ |

### Infrastructure/White-Label

| Provider | Focus | Website |
|----------|-------|---------|
| **SDK.finance** | White-label crypto-fiat platform | https://sdk.finance/ |
| **Fiat Republic** | Crypto-friendly banking API | https://fiatrepublic.com/ |
| **PayQuicker** | Payouts orchestration | https://payquicker.com/ |
| **Routable** | API-first mass payouts | https://www.routable.com/ |
| **Airwallex** | Global payouts API | https://www.airwallex.com/ |

---

## 4. Recommendation

### For Our Platform (Octopus)

Based on the research, here's the recommended approach:

#### Option A: Whop (Recommended for Speed)

**Pros:**
- Proven to work for Sideshift (similar use case)
- Multi-method payouts (crypto + fiat) out of the box
- Built-in KYC/compliance
- No monthly fees
- White-label capable
- Modern API with SDKs
- Active in B2B platform partnerships

**Cons:**
- 2.7% + $0.30 per transaction
- Platform commission structure may add up
- Relatively newer infrastructure

**Next Steps:**
1. Contact Whop about platform/B2B integration
2. Review API documentation at docs.whop.com
3. Test in sandbox environment

#### Option B: Trolley (Recommended for Control)

**Pros:**
- Purpose-built for creator economy
- Excellent tax compliance (1099s automated)
- Lower FX markup (~2%)
- Transparent pricing
- Forever-free sandbox

**Cons:**
- $49/month minimum
- Limited native crypto support
- Need to integrate crypto separately

#### Option C: Dots (Recommended for Fast MVP)

**Pros:**
- Integrate in under 2 hours
- Native stablecoin support
- Payout Links (no recipient onboarding)
- 300+ payment rails

**Cons:**
- Custom pricing (need to contact)
- Smaller company

---

## 5. Key Takeaways

1. **Whop is a viable B2B payout infrastructure** - Not just a creator marketplace, but a payments platform that other businesses can integrate.

2. **Multi-method payouts are becoming standard** - All major providers now support crypto alongside fiat.

3. **KYC/Compliance is bundled** - No need to build separate KYC flows; these platforms handle it.

4. **API-first is the norm** - All providers offer REST APIs with good documentation.

5. **Pricing varies significantly** - From free (Whop) to $99+/month (Tipalti), with transaction fees ranging from 1% to 3%.

---

## Sources

- [Whop Platform Docs](https://docs.whop.com/supported-business-models/platforms)
- [Whop Payments](https://whop.com/payments/)
- [Whop API Getting Started](https://docs.whop.com/developer/api/getting-started)
- [Whop Fees](https://docs.whop.com/fees)
- [Whop Pricing 2026](https://www.schoolmaker.com/blog/whop-pricing)
- [Whop New Payments Infrastructure Announcement](https://www.barchart.com/story/news/34627628/whop-announces-new-payments-infrastructure-making-instant-payouts-available-worldwide)
- [Trolley Platform](https://trolley.com/)
- [Trolley Creator Payouts](https://trolley.com/use-cases/creator-influencer-platform-payouts/)
- [Tipalti Payout API](https://tipalti.com/mass-payments/payout-api/)
- [Tipalti vs Trolley](https://tipalti.com/resources/learn/tipalti-vs-trolley/)
- [Hyperwallet Marketplace Payouts](https://www.hyperwallet.com/marketplace-payouts/)
- [Hyperwallet Developers](https://www.hyperwallet.com/developers/)
- [Payoneer Marketplace](https://www.payoneer.com/marketplace/)
- [Payoneer Mass Payouts API](https://developer.payoneer.com/docs/mass-payouts-and-services.html)
- [Dots Payouts](https://usedots.com/)
- [Dots Payouts API](https://usedots.com/platform/payouts-api/)
- [Rise (Riseworks)](https://www.riseworks.io/)
- [Rise API Docs](https://docs.riseworks.io/)
- [Creator Payout Automation Platforms 2026](https://www.routable.com/resources/creator-payout-automation-platforms/)
- [State of Payouts 2026](https://payquicker.com/payout-trends-2026/)
- [API Payment Platforms 2026](https://www.routable.com/resources/api-first-payment-platforms-for-developers/)

---

*Last Updated: February 2026*
