# Mariposa Finance × Connect — Integration & Revenue Model

## Overview

Mariposa Finance and Mariposa Connect are two independent products that share a common ecosystem: one wallet identity, one governance token ($CAPULLO), and a closed-loop revenue model that benefits both products and token holders.

---

## Section 1: Shared Identity Architecture

Both products use the same wallet-based identity system:

- **Single wallet** — The user's crypto wallet (MetaMask, Phantom, etc.) is their identity across both Finance and Connect
- **One token** — $CAPULLO serves as the governance and utility token for both products
- **Unified Alas Points** — Early participation rewards are shared across both products pre-launch

This means a user who deposits into Jardines vaults on Finance uses the same identity to send encrypted messages on Connect, stake relay infrastructure, and earn $CAPULLO rewards.

---

## Section 2: Fiat On/Off Ramps — Multi-Provider

Both Finance and Connect integrate three fiat on/off ramp providers independently. Each product earns referral or partner margin revenue from fiat transactions, giving users the best rate across providers and maximizing geographic coverage.

### Transak (Primary)
- **Coverage**: 64+ countries
- **Integration**: White-label SDK with configurable partner margin (0.5–1.5%)
- **Supported**: Credit/debit cards, bank transfers, Apple Pay, Google Pay
- **Both products**: Finance (vault deposits) + Connect (fiat transfers)

### PayPal On/Off Ramps
- **Coverage**: United States only
- **Revenue**: 0.99% transaction rate referral
- **Asset support**: PYUSD and major cryptocurrencies
- **Rationale**: Trusted mainstream brand accelerates U.S. adoption; PYUSD aligns with DeFi use cases
- **Finance**: Vault deposits from U.S. users
- **Connect**: Not available (U.S.-only scope limits Connect's cross-border use case)

### MoonPay
- **Coverage**: 110+ countries
- **Revenue**: ~1% for bank transfers (configurable partner share)
- **Supported**: Credit/debit cards, Apple Pay, Google Pay, bank transfers
- **Both products**: Finance + Connect — widest geographic coverage, fallback for regions Transak doesn't serve

### Revenue Table

| Revenue Source | Product | Type |
|---|---|---|
| Vault performance fee (4.5%) | Finance | Per-harvest |
| Swap aggregation fee (0.15%) | Finance | Per-swap |
| Transak on/off-ramp margin (0.5–1.5%) | Connect + Finance | Per-transaction |
| PayPal on/off-ramp margin (~0.99%) | Finance (U.S.) | Per-transaction |
| MoonPay on/off-ramp margin (~1%) | Connect + Finance | Per-transaction |
| Relay infrastructure fee (20% of Connect revenue) | Connect → Finance | Revenue share |
| Premium dashboard subscription | Finance | Recurring |
| Liquidity-as-a-Service (Colmena) | Finance | Per-project |

---

## Section 3: Cross-Product Revenue Sharing — Connect → Finance

### The 20% Relay Infrastructure Fee

Mariposa Connect pays **20% of its subscription revenue** back to the Mariposa Finance treasury as a "relay infrastructure fee."

**Why?** The fee compensates Finance for the $CAPULLO token rewards it issues to incentivize relay hosters. Those relay hosters run the infrastructure that makes Connect's censorship-resistant network possible.

### Closed-Loop Economics

```
Finance issues $CAPULLO rewards
         ↓
Relay hosters stake $CAPULLO to run Connect servers
         ↓
Connect gains censorship-resistant infrastructure
         ↓
Connect earns subscription revenue from users
         ↓
Connect pays 20% back to Finance treasury
         ↓
Finance treasury funds operations, reducing need to sell $CAPULLO
         ↓
Reduced sell pressure supports token price
         ↓
Loop continues
```

### Fee Calculation

- Connect charges users a monthly/annual subscription
- 20% of gross subscription revenue is transferred to Finance treasury monthly
- Finance treasury distributes:
  - Operational expenses (audits, infrastructure, team)
  - veCAPULLO staker rewards (in ETH/USDC)
  - $CAPULLO relay staking reward pool

---

## Section 4: $CAPULLO Tokenomics

### Token Parameters

| Parameter | Value |
|---|---|
| Name | CAPULLO |
| Max Supply | 100,000,000 (100M) |
| Model | veToken (vote-escrow) |
| Revenue share | ETH/USDC (NOT $CAPULLO) |

### Token Distribution

| Allocation | % | Tokens |
|---|---|---|
| Community (Alas + rewards) | 25% | 25,000,000 |
| Treasury / DAO | 30% | 30,000,000 |
| Team & Advisors | 15% | 15,000,000 |
| Liquidity (DEX) | 10% | 10,000,000 |
| Investors | 10% | 10,000,000 |
| Ecosystem Fund | 10% | 10,000,000 |

> **Note**: Revenue sharing pays stakers in ETH/USDC — NOT in $CAPULLO tokens. Token supply never depletes from staking rewards.

### Halving Emission Schedule (Community Allocation)

Community $CAPULLO is emitted via Alas Points → token conversion and ongoing protocol rewards, following a Bitcoin-style halving:

| Year | Tokens Emitted |
|---|---|
| Year 1 | 6,000,000 |
| Year 2 | 3,000,000 |
| Year 3 | 1,500,000 |
| Year 4 | 750,000 |
| Year 5 | 375,000 |
| … | halving continues |
| **Total (10yr)** | **~12,000,000** |

~13M tokens remain in the community reserve after 10 years, preserving long-term incentive capacity.

### Performance Fee Distribution

All vault harvest fees (4.5% of yield) are distributed as follows:

| Recipient | Share | Purpose |
|---|---|---|
| veCAPULLO Stakers | 1.5% | Real yield in ETH/USDC |
| Treasury | 1.5% | Operations, audits, grants |
| Strategist | 0.5% | Vault strategy developer reward |
| Harvest Caller | 1.0% | Gas reimbursement + operational incentive |

---

## Section 5: Connect Integration Points in Finance

### Fiat Transfer Flow
When a Finance user receives yield, they can:
1. Swap yield tokens to USDC (Finance DEX aggregator)
2. Off-ramp to fiat via Transak/PayPal/MoonPay (Finance)
3. Send fiat to family via Connect (cross-border)

All three steps use the same wallet identity; Finance and Connect share the fiat provider SDK configurations.

### Relay Hosting via Finance
Users can stake $CAPULLO earned via Finance vaults directly into Connect relay hosting:
- No need to bridge or swap
- Same wallet, same token
- Relay staking APY ~12% (paid from Connect subscription revenue → Finance treasury → relay reward pool)

### Shared Dashboard (Future)
A unified "Mariposa Wallet" view will show:
- Finance vault positions + earned yield
- Connect relay staking positions + relay rewards
- Combined $CAPULLO balance (locked veCAPULLO + liquid)
- Alas Points across both products

---

## Section 6: Technical Integration Notes

### SDK Versions
- Transak SDK v2 (Web3 mode for wallet-connected deposits)
- PayPal JS SDK (checkout.js, on/off ramp flow)
- MoonPay Web SDK (iframe embed or redirect flow)

### Wallet Support
- EVM wallets (MetaMask, Coinbase Wallet, WalletConnect): all three ramps
- Solana wallets (Phantom): Transak + MoonPay
- Non-EVM (Algorand, Sui, Aptos): Transak only (widest non-EVM coverage)

### Revenue Tracking
Each fiat transaction is tagged with:
- `product`: `finance` | `connect`
- `provider`: `transak` | `paypal` | `moonpay`
- `user_wallet`: wallet address
- `chain`: destination chain

Revenue reports are reconciled monthly and relay infrastructure fee transferred from Connect treasury to Finance treasury on-chain.
