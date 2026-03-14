# Mariposa Finance — Master Plan Updates (2026-03-14)

This document records all changes to the master plan. Apply these to `mariposa-master-plan.docx` or use this as the authoritative updated reference.

---

## Section 8.1 — Revenue Streams (UPDATED)

Add the following revenue streams to the existing list:

### Fiat On/Off Ramp Revenue (NEW)
| Provider | Coverage | Revenue Model |
|---|---|---|
| Transak | 64+ countries | 0.5–1.5% partner margin per transaction |
| PayPal On/Off Ramps | U.S. only | ~0.99% per transaction referral |
| MoonPay | 110+ countries | ~1% per transaction (bank transfers) |

- **Finance integration**: All three providers — vault deposit/withdrawal flows
- **Connect integration**: Transak + MoonPay (PayPal U.S.-only scope limits cross-border utility)
- Revenue from each product's fiat transactions is earned independently

### Connect Relay Infrastructure Fee (NEW)
- **Amount**: 20% of Mariposa Connect gross subscription revenue
- **Paid by**: Connect treasury → Finance treasury
- **Frequency**: Monthly
- **Purpose**: Compensates Finance for $CAPULLO relay staking incentives that fund Connect's infrastructure
- **Impact**: Creates recurring revenue stream for Finance treasury independent of DeFi market conditions

---

## Section 8.2 — Performance Fee Distribution (CHANGED)

**Previous**: 4.5% total split unspecified
**Updated**: 4.5% total, split as follows:

| Recipient | Share | Purpose |
|---|---|---|
| veCAPULLO Stakers | 1.5% | Real yield paid in ETH/USDC |
| Treasury | 1.5% | Operations, audits, grants, development |
| Strategist | 0.5% | Vault strategy developer reward |
| Harvest Caller | 1.0% | Gas reimbursement + operational incentive |

> **Important note**: Revenue sharing pays stakers in ETH/USDC — NOT in $CAPULLO tokens. Token supply never depletes from staking rewards. This distinction is critical for sustainable tokenomics: the protocol earns real yield (ETH/USDC) and passes it through, rather than inflating supply.

---

## Section 9.2 — Token Distribution (CHANGED)

**Previous allocation**:
- Community: 30%, Treasury: 25%

**Updated allocation**:

| Allocation | % | Tokens |
|---|---|---|
| Community (Alas + rewards) | 25% | 25,000,000 |
| Treasury / DAO | 30% | 30,000,000 |
| Team & Advisors | 15% | 15,000,000 |
| Liquidity (DEX) | 10% | 10,000,000 |
| Investors | 10% | 10,000,000 |
| Ecosystem Fund | 10% | 10,000,000 |
| **Total** | **100%** | **100,000,000** |

**Rationale for shift**: Treasury increased from 25% → 30% to ensure long-term operational capacity, fund audits, and support the relay infrastructure fee cycle. Community reduced from 30% → 25% but emissions are extended via halving schedule (see Section 9.5).

---

## Section 9.3 — Strategist Incentives (RENAMED + UPDATED)

**Previous title**: "Strategist Incentives"
**New title**: "Strategy Rewards"

**New description**:

Build and publish vault strategies for the Mariposa community. Earn $CAPULLO when other users copy your strategy and deploy capital into it. Rewards are proportional to the total value locked (TVL) attracted by your strategy, with monthly caps per strategist to prevent concentration.

**Reward mechanics**:
- Strategy author earns $CAPULLO from the 0.5% strategist performance fee share
- Rewards accrue in real-time as vaults harvest
- Monthly cap: 50,000 $CAPULLO per strategy author (anti-whale measure)
- Strategies must pass automated security checks before deployment
- Community voting can promote strategies to "featured" status (higher visibility, no additional rewards)

---

## Section 9.5 — Halving Emission Schedule (NEW SECTION)

The 25M community allocation is emitted following a Bitcoin-style halving schedule, preventing token inflation from undermining the revenue-sharing model.

### Emission Schedule

| Year | Annual Emission | Cumulative |
|---|---|---|
| Year 1 | 6,000,000 | 6,000,000 |
| Year 2 | 3,000,000 | 9,000,000 |
| Year 3 | 1,500,000 | 10,500,000 |
| Year 4 | 750,000 | 11,250,000 |
| Year 5 | 375,000 | 11,625,000 |
| Year 6 | 187,500 | 11,812,500 |
| Year 7 | 93,750 | 11,906,250 |
| Year 8 | 46,875 | 11,953,125 |
| Year 9 | 23,437 | 11,976,562 |
| Year 10 | 11,718 | 11,988,280 |

**~12M tokens emitted over 10 years. ~13M remain in reserve.**

### Reserve Usage
The ~13M reserve tokens are held by the DAO treasury and can be deployed for:
- Future chain expansion incentives (new ecosystem bootstrapping)
- Emergency security reserves
- Long-term contributor grants (4+ year vesting)
- DAO governance vote for other purposes (requires supermajority)

### Emission Sources
Community tokens are distributed via:
1. **Alas Points conversion** — Pre-launch points convert at fixed ratio at TGE
2. **Vault yield boosters** — veCAPULLO lockup incentives (Year 1–2 priority)
3. **Strategy rewards** — 0.5% fee share to vault strategy authors
4. **Relay staking rewards** — Incentivize Connect relay infrastructure (draws from Ecosystem Fund, not community allocation)

---

## Summary of All Changes

| Section | Change Type | Summary |
|---|---|---|
| 8.1 Revenue Streams | ADDED | Transak, PayPal, MoonPay fiat ramp revenue |
| 8.1 Revenue Streams | ADDED | Connect relay infrastructure fee (20% of Connect revenue) |
| 8.2 Performance Fee Split | UPDATED | 1.5% stakers / 1.5% treasury / 0.5% strategist / 1.0% caller |
| 8.2 Performance Fee Note | ADDED | Revenue pays ETH/USDC, not $CAPULLO |
| 9.2 Token Distribution | UPDATED | Community 25% / Treasury 30% (was 30%/25%) |
| 9.3 Strategist Incentives | RENAMED | Now "Strategy Rewards" with copy-to-earn mechanics |
| 9.5 Halving Emissions | NEW | Halving schedule, 10yr emission table, reserve usage |
