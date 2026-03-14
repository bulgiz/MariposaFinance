// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "What is Mariposa Finance?",
    a: "Mariposa Finance is a multi-chain DeFi yield aggregator that optimizes your returns across 13 blockchains. Our auto-compounding vaults (called Jardines) automatically harvest and reinvest your yields from top protocols like Aave, Uniswap V3, Aerodrome, Camelot, Curve, and more — so you don't have to manually manage positions.",
  },
  {
    q: "Which blockchains are supported?",
    a: "Mariposa supports both EVM and non-EVM chains: Base, Arbitrum, Ethereum, Solana, Polygon, Optimism, BSC, Fantom, Avalanche, zkSync Era, Algorand, Sui, and Aptos. We're launching with Base and Arbitrum first, expanding to additional chains over the following months.",
  },
  {
    q: "What is $CAPULLO and how do I earn it?",
    a: "$CAPULLO is our governance token with a fixed supply of 100 million — no inflation. Before the token launches, you can earn Alas (Wings) points by using the platform, referring friends, participating in Discord, and reporting bugs. Alas convert to $CAPULLO at a fixed ratio at launch. veCAPULLO holders earn real revenue sharing from vault performance fees.",
  },
  {
    q: "How does Mariposa make money?",
    a: "Mariposa charges a 4.5% performance fee on vault harvest rewards — among the lowest in the industry. Additional revenue comes from swap aggregation fees (0.15%), a premium dashboard tier, and Liquidity-as-a-Service (Colmena) for projects seeking cost-effective liquidity.",
  },
  {
    q: "Is Mariposa Finance audited?",
    a: "Security is our top priority. Vault smart contracts will undergo a full external audit before handling any user funds. We're pursuing both traditional audits and audit contests through reputable security firms. The read-only dashboard (current phase) involves no smart contract risk. We also plan an ongoing bug bounty program on Immunefi.",
  },
  {
    q: "What is Mariposa Connect?",
    a: "Mariposa Connect is a censorship-resistant encrypted messenger that shares the same wallet identity and $CAPULLO token as Mariposa Finance. Users can earn staking rewards by hosting relay servers that help families communicate across censored regions. Finance and Connect are developed independently but share one ecosystem.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="m-section" id="faq">
      <header>
        <div className="m-section-label">FAQ</div>
        <h2 className="m-section-title">Frequently Asked Questions</h2>
      </header>
      <div className="m-faq-list">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="m-faq-item">
            <button
              className="m-faq-q"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              {item.q}
              <span className={`m-faq-arrow${openIndex === i ? " open" : ""}`}>▼</span>
            </button>
            <div className={`m-faq-a${openIndex === i ? " open" : ""}`}>
              <p>{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
