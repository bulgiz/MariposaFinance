// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

import type { Metadata } from "next";
import { ButterflyCanvas } from "@/components/marketing/butterfly-canvas";
import { LoadingScreen } from "@/components/marketing/loading-screen";
import { FaqSection } from "@/components/marketing/faq";

export const metadata: Metadata = {
  title:
    "Mariposa Finance — Multi-Chain DeFi Yield Aggregator | Auto-Compounding Vaults",
  description:
    "Mariposa Finance is a next-generation multi-chain DeFi yield aggregator. Auto-compounding vaults (Jardines) across Base, Arbitrum, Ethereum, Solana, and 9+ chains. Earn the best yields effortlessly with ZAP deposits, DEX aggregation, and the $CAPULLO governance token.",
  keywords:
    "DeFi yield aggregator, auto-compounding vaults, yield farming, Base, Arbitrum, Ethereum, Solana, multi-chain DeFi, DEX aggregator, $CAPULLO token, Mariposa Finance, Jardines vaults",
  alternates: { canonical: "https://mariposa.finance/" },
  openGraph: {
    title: "Mariposa Finance — Multi-Chain DeFi Yield Aggregator",
    description:
      "Auto-compounding vaults across 13 chains. Earn the best DeFi yields effortlessly with Jardines vaults, ZAP deposits, and DEX aggregation.",
    type: "website",
    url: "https://mariposa.finance/",
    siteName: "Mariposa Finance",
    images: [
      {
        url: "https://mariposa.finance/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mariposa Finance — Multi-Chain DeFi Yield Aggregator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mariposa Finance — Multi-Chain DeFi Yield Aggregator",
    description: "Auto-compounding vaults across 13 chains. Earn the best DeFi yields effortlessly.",
    images: ["https://mariposa.finance/og-image.png"],
  },
};

const jsonLdApp = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Mariposa Finance",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Multi-chain DeFi yield aggregator with auto-compounding vaults across Base, Arbitrum, Ethereum, Solana, and more.",
  url: "https://mariposa.finance",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Auto-compounding yield vaults (Jardines)",
    "Multi-chain support across 13 blockchains",
    "Single-token ZAP deposits",
    "DEX aggregation with best-route swaps",
    "Cross-chain portfolio tracking",
    "$CAPULLO governance token with real revenue sharing",
    "Alas points program for early users",
    "Mariposa Connect encrypted messenger integration",
    "Incentivized relay hosting with staking rewards",
  ],
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Mariposa Finance?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Mariposa Finance is a multi-chain DeFi yield aggregator that optimizes your returns across 13 blockchains. Our auto-compounding vaults (called Jardines) automatically harvest and reinvest your yields from top protocols like Aave, Uniswap, Aerodrome, and more.",
      },
    },
    {
      "@type": "Question",
      name: "What chains does Mariposa Finance support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Mariposa Finance supports Base, Arbitrum, Ethereum, Optimism, Polygon, BSC, Fantom, Avalanche, zkSync Era, Solana, Algorand, Sui, and Aptos — covering both EVM and non-EVM ecosystems.",
      },
    },
    {
      "@type": "Question",
      name: "What is the $CAPULLO token?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "$CAPULLO is Mariposa Finance's governance token with a fixed supply of 100 million. veCAPULLO holders earn real revenue sharing from vault performance fees, vote on protocol decisions, and receive boosted yields on their deposits.",
      },
    },
    {
      "@type": "Question",
      name: "What is Mariposa Connect?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Mariposa Connect is a censorship-resistant encrypted messenger built on the same wallet identity as Mariposa Finance. Users can earn staking rewards by hosting relay servers that help families communicate across censored regions.",
      },
    },
  ],
};

export default function MarketingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      <div className="marketing-page">
        <LoadingScreen />
        <ButterflyCanvas />

        {/* NAV */}
        <nav className="m-nav">
          <a href="/" className="m-nav-logo">
            <span className="logo-main">Mariposa</span>
            <span className="logo-sub">Finance</span>
          </a>
          <div className="m-nav-links">
            <a href="#features">Features</a>
            <a href="#chains" className="hide-mobile">Chains</a>
            <a href="#tokenomics" className="hide-mobile">$CAPULLO</a>
            <a href="#roadmap">Roadmap</a>
            <div className="m-badge-cs">
              <span className="m-dot" />
              Wallet Coming Soon
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="m-hero">
          <div className="m-glow-orb purple" />
          <div className="m-glow-orb gold" />
          <div className="m-glow-orb purple2" />
          <div className="m-hero-content">
            <div className="m-hero-tagline">Multi-Chain DeFi Yield Aggregator</div>
            <h1 className="m-hero-title">
              <span className="purple">Mariposa</span>{" "}
              <span className="gold">Finance</span>
            </h1>
            <p className="m-hero-sub">
              Auto-compounding vaults that harvest and reinvest your yields across Base,
              Arbitrum, Ethereum, Solana, and 9 more chains — effortlessly.
            </p>
            <p className="m-hero-motto">From cocoon to butterfly.</p>
            <div className="m-hero-actions">
              <a href="#features" className="m-btn-primary">
                Explore What&apos;s Coming
              </a>
              <a href="#alas" className="m-btn-secondary">
                Earn Alas Points
              </a>
            </div>
          </div>
          <div className="m-scroll-hint">
            <div className="chevron" />
          </div>
        </section>

        {/* TOP FEATURES */}
        <section className="m-features-grid" id="features">
          <article className="m-feature-card">
            <div className="m-feature-icon purple">🦋</div>
            <h3>Jardines (Vaults)</h3>
            <p>
              Auto-compounding vaults that harvest and reinvest your yields across top DeFi
              protocols like Aave, Uniswap, Aerodrome, Camelot, and more.
            </p>
          </article>
          <article className="m-feature-card">
            <div className="m-feature-icon blue">🔗</div>
            <h3>13 Chains Supported</h3>
            <p>
              Base, Arbitrum, Ethereum, Solana, Polygon, Optimism, BSC, Fantom, Avalanche,
              zkSync, Algorand, Sui, and Aptos. EVM and non-EVM.
            </p>
          </article>
          <article className="m-feature-card">
            <div className="m-feature-icon gold">🪙</div>
            <h3>$CAPULLO Token</h3>
            <p>
              Governance token with real revenue sharing. veCAPULLO holders earn from vault
              fees, vote on protocol decisions, and get boosted yields.
            </p>
          </article>
        </section>

        {/* HOW IT WORKS */}
        <div className="m-section-alt">
          <section className="m-section" id="how-it-works">
            <header className="m-section-header-center">
              <div className="m-section-label">How It Works</div>
              <h2 className="m-section-title">
                DeFi Yields,{" "}
                <span style={{ color: "var(--m-gold)" }}>Simplified</span>
              </h2>
              <p className="m-section-subtitle">
                No manual harvesting, no complex LP management. Deposit once and let
                Jardines vaults optimize your returns automatically.
              </p>
            </header>
            <div className="m-how-steps">
              <div className="m-how-step">
                <div className="m-how-step-num">1</div>
                <h4>Choose a Jardín</h4>
                <p>
                  Browse yield opportunities across 13 chains. Filter by APY, risk level,
                  protocol, or asset type.
                </p>
                <span className="m-how-step-arrow">→</span>
              </div>
              <div className="m-how-step">
                <div className="m-how-step-num">2</div>
                <h4>ZAP Deposit</h4>
                <p>
                  Deposit any single token. Our ZAP router automatically swaps, provides
                  liquidity, and stakes — all in one transaction.
                </p>
                <span className="m-how-step-arrow">→</span>
              </div>
              <div className="m-how-step">
                <div className="m-how-step-num">3</div>
                <h4>Auto-Compound</h4>
                <p>
                  Metamorfosis kicks in. Rewards are harvested and reinvested automatically,
                  compounding your yields 24/7.
                </p>
                <span className="m-how-step-arrow">→</span>
              </div>
              <div className="m-how-step">
                <div className="m-how-step-num">4</div>
                <h4>Withdraw Anytime</h4>
                <p>
                  No lockups. Withdraw your assets plus accumulated yields whenever you
                  want. Your funds stay fully under your control.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* DIFFERENTIATORS */}
        <section className="m-section">
          <header className="m-section-header-center">
            <div className="m-section-label">Why Mariposa</div>
            <h2 className="m-section-title">
              What Sets Us{" "}
              <span style={{ color: "var(--m-purple)" }}>Apart</span>
            </h2>
            <p className="m-section-subtitle">
              Features designed to go beyond what traditional yield aggregators offer today.
            </p>
          </header>
          <div className="m-diff-grid">
            <article className="m-diff-card">
              <div className="m-diff-card-header">
                <span>🎯</span>
                <h4>
                  Intent-Based Farming{" "}
                  <span className="m-badge-new">NEW</span>
                </h4>
              </div>
              <p>
                Declare your goal — &ldquo;earn 8% on USDC, low risk&rdquo; — and the
                system auto-selects the best vault and chain for you.
              </p>
            </article>
            <article className="m-diff-card">
              <div className="m-diff-card-header">
                <span>🤖</span>
                <h4>
                  AI Strategy Advisor{" "}
                  <span className="m-badge-new">NEW</span>
                </h4>
              </div>
              <p>
                AI-powered agent analyzes on-chain data, explains risks in plain English,
                and suggests personalized yield strategies.
              </p>
            </article>
            <article className="m-diff-card">
              <div className="m-diff-card-header">
                <span>⛽</span>
                <h4>Gasless UX (ERC-4337)</h4>
              </div>
              <p>
                Account abstraction lets you deposit with stablecoins only — no need to
                hold native gas tokens on every chain.
              </p>
            </article>
            <article className="m-diff-card">
              <div className="m-diff-card-header">
                <span>🔄</span>
                <h4>
                  Cross-Chain Auto-Rebalance{" "}
                  <span className="m-badge-new">NEW</span>
                </h4>
              </div>
              <p>
                If yields drop on one chain, your position auto-bridges and redeploys to a
                higher-yielding opportunity on another chain.
              </p>
            </article>
            <article className="m-diff-card">
              <div className="m-diff-card-header">
                <span>🛡️</span>
                <h4>Impermanent Loss Protection</h4>
              </div>
              <p>
                Single-sided deposits with protocol-level IL insurance funded by the fee
                reserve. Earn LP yields without the LP risk.
              </p>
            </article>
            <article className="m-diff-card">
              <div className="m-diff-card-header">
                <span>📋</span>
                <h4>Copy Strategies</h4>
              </div>
              <p>
                Follow top-performing vault strategies built by the community. One-click
                copy to mirror their positions and earn the same yields.
              </p>
            </article>
          </div>
        </section>

        {/* CHAINS */}
        <div className="m-section-alt">
          <section className="m-section" id="chains">
            <header className="m-section-header-center">
              <div className="m-section-label">Ecosystem</div>
              <h2 className="m-section-title">
                <span style={{ color: "var(--m-purple)" }}>13 Chains.</span> One
                Dashboard.
              </h2>
              <p className="m-section-subtitle">
                The broadest chain coverage of any yield aggregator. EVM and non-EVM
                ecosystems, all in one place.
              </p>
            </header>
            <div className="m-chains-grid">
              {[
                { icon: "🔵", name: "Base", priority: "Launch" },
                { icon: "🔷", name: "Arbitrum", priority: "Launch" },
                { icon: "💎", name: "Ethereum", priority: "Month 3" },
                { icon: "☀️", name: "Solana", priority: "Month 4" },
                { icon: "🟣", name: "Polygon", priority: "Month 4" },
                { icon: "🔴", name: "Optimism", priority: "Month 5" },
                { icon: "🟡", name: "BSC", priority: "Month 5" },
                { icon: "👻", name: "Fantom", priority: "Month 5" },
                { icon: "🔺", name: "Avalanche", priority: "Month 6" },
                { icon: "⚡", name: "zkSync Era", priority: "Month 6" },
                { icon: "🟢", name: "Algorand", priority: "Month 6" },
                { icon: "💧", name: "Sui", priority: "Month 7" },
                { icon: "🌱", name: "Aptos", priority: "Month 7" },
              ].map((chain) => (
                <div key={chain.name} className="m-chain-pill">
                  <span className="m-chain-icon">{chain.icon}</span>
                  {chain.name}
                  <span className="m-chain-priority">{chain.priority}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* TOKENOMICS */}
        <section className="m-section" id="tokenomics">
          <header>
            <div className="m-section-label">Tokenomics</div>
            <h2 className="m-section-title">
              <span style={{ color: "var(--m-gold)" }}>$CAPULLO</span> — Real
              Revenue, Not Emissions
            </h2>
            <p className="m-section-subtitle">
              A governance token backed by actual protocol revenue. Fixed supply. No
              inflation. veCAPULLO holders earn their share of every vault harvest.
            </p>
          </header>
          <div className="m-token-grid">
            <div>
              <div className="m-token-stats">
                {[
                  { label: "Token", value: "$CAPULLO", cls: "gold" },
                  { label: "Max Supply", value: "100M", cls: "purple" },
                  { label: "Model", value: "veCAPULLO", cls: "" },
                  { label: "Revenue Share", value: "3% of fees", cls: "gold" },
                  { label: "Community", value: "25%", cls: "purple" },
                  { label: "Treasury/DAO", value: "30%", cls: "purple" },
                ].map((stat) => (
                  <div key={stat.label} className="m-token-stat">
                    <div className="m-token-stat-label">{stat.label}</div>
                    <div
                      className={`m-token-stat-value${stat.cls ? ` ${stat.cls}` : ""}`}
                      style={!stat.cls ? { fontSize: "1.2rem" } : undefined}
                    >
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "8px" }}>
                Token Utility
              </h3>
              <ul className="m-token-utility-list">
                <li>
                  <span className="m-check">✦</span>
                  <span>
                    <strong>Revenue Sharing</strong> —{" "}
                    <span>
                      veCAPULLO holders receive 3% of all vault performance fees paid in
                      ETH/USDC
                    </span>
                  </span>
                </li>
                <li>
                  <span className="m-check">✦</span>
                  <span>
                    <strong>Governance</strong> —{" "}
                    <span>
                      Vote on vault additions, fee changes, treasury allocation, and chain
                      expansion priorities
                    </span>
                  </span>
                </li>
                <li>
                  <span className="m-check">✦</span>
                  <span>
                    <strong>Boosted Yields</strong> —{" "}
                    <span>
                      Up to 2.5x yield boost on vault deposits for veCAPULLO holders
                    </span>
                  </span>
                </li>
                <li>
                  <span className="m-check">✦</span>
                  <span>
                    <strong>Fee Discounts</strong> —{" "}
                    <span>Premium features discounted when paid with $CAPULLO</span>
                  </span>
                </li>
                <li>
                  <span className="m-check">✦</span>
                  <span>
                    <strong>Strategy Rewards</strong> —{" "}
                    <span>
                      Build and publish vault strategies for the community and earn $CAPULLO
                      when others copy them
                    </span>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ALAS POINTS */}
        <div className="m-section-full m-section-alt" id="alas">
          <div className="m-alas-banner">
            <div className="m-section-label">Pre-Token Launch Program</div>
            <h2>
              Earn Your{" "}
              <span style={{ color: "var(--m-gold)" }}>Alas</span> (Wings)
            </h2>
            <p>
              Before $CAPULLO launches, earn Alas points that convert to tokens at launch.
              The earlier you join, the more wings you collect.
            </p>
            <div className="m-alas-ways">
              <div className="m-alas-way">
                <span>🦋</span> Use the platform
              </div>
              <div className="m-alas-way">
                <span>👥</span> Refer friends
              </div>
              <div className="m-alas-way">
                <span>💬</span> Discord activity
              </div>
              <div className="m-alas-way">
                <span>🐛</span> Bug reports
              </div>
            </div>
            <a href="#" className="m-btn-gold">
              Join Discord &amp; Start Earning
            </a>
          </div>
        </div>

        {/* ECOSYSTEM */}
        <section className="m-section" id="ecosystem">
          <header className="m-section-header-center">
            <div className="m-section-label">Bigger Picture</div>
            <h2 className="m-section-title">
              The <span style={{ color: "var(--m-purple)" }}>Mariposa</span>{" "}
              Ecosystem
            </h2>
            <p className="m-section-subtitle">
              Mariposa Finance is part of a broader ecosystem. One wallet, one token,
              multiple products — all interconnected.
            </p>
          </header>
          <div className="m-eco-grid">
            <article className="m-eco-card">
              <div className="m-eco-card-icon">💬</div>
              <h4>Mariposa Connect</h4>
              <p>
                A censorship-resistant encrypted messenger designed to help families
                reconnect across borders where communication is monitored. End-to-end
                encrypted with Signal Protocol, powered by wallet-based identity.
              </p>
              <p>
                Built-in crypto transfers, fiat on/off ramps (Transak, PayPal, MoonPay),
                and deep integration with Finance&apos;s swap interface. One ecosystem,
                one identity.
              </p>
              <span className="m-eco-tag purple">Coming Soon</span>
            </article>
            <article className="m-eco-card">
              <div className="m-eco-card-icon">📡</div>
              <h4>Relay Hosting Rewards</h4>
              <p>
                Earn yield by running a Mariposa Connect relay server. Stake $CAPULLO
                tokens, maintain uptime, and help people in censored regions communicate
                freely — while earning up to 12% APY.
              </p>
              <p>
                Relay staking creates real demand for $CAPULLO and builds
                censorship-resistant infrastructure at the same time. DeFi meets social
                impact.
              </p>
              <span className="m-eco-tag gold">Staking Rewards</span>
            </article>
          </div>
        </section>

        {/* ROADMAP */}
        <div className="m-section-alt">
          <section className="m-section" id="roadmap">
            <header>
              <div className="m-section-label">Roadmap</div>
              <h2 className="m-section-title">
                The{" "}
                <span style={{ color: "var(--m-purple)" }}>Metamorfosis</span>{" "}
                Timeline
              </h2>
              <p className="m-section-subtitle">
                A phased rollout prioritizing security at every stage. No rushing to
                mainnet — we audit first.
              </p>
            </header>
            <div className="m-roadmap-timeline">
              <div className="m-roadmap-phase">
                <div className="m-roadmap-dot active" />
                <div className="m-roadmap-label">Phase 1 — Now</div>
                <h4>Dashboard &amp; Read-Only</h4>
                <p>
                  Live public dashboard showing yield opportunities across Base and
                  Arbitrum. Pool data from Aave, Uniswap V3, Aerodrome, and Camelot.
                  Wallet portfolio tracking. Alas points program begins.
                </p>
              </div>
              <div className="m-roadmap-phase">
                <div className="m-roadmap-dot" />
                <div className="m-roadmap-label">Phase 2</div>
                <h4>Vault Contracts &amp; Deposits</h4>
                <p>
                  ERC-4626 vault smart contracts deployed to testnets. Auto-compound
                  worker for harvesting and reinvestment. Deposit and withdraw flows.
                  Security audit funded via grants and organic revenue.
                </p>
              </div>
              <div className="m-roadmap-phase">
                <div className="m-roadmap-dot" />
                <div className="m-roadmap-label">Phase 3</div>
                <h4>ZAP &amp; DEX Aggregation</h4>
                <p>
                  Single-token ZAP deposits — swap, provide liquidity, and stake in one
                  transaction. Best-route DEX aggregation across protocols. Swap
                  aggregator with 1inch, Paraswap, 0x, and OpenOcean.
                </p>
              </div>
              <div className="m-roadmap-phase">
                <div className="m-roadmap-dot" />
                <div className="m-roadmap-label">Phase 4</div>
                <h4>Ethereum + Solana Expansion</h4>
                <p>
                  Ethereum mainnet with Curve and Balancer strategies. Solana vaults via
                  Anchor (Raydium, Orca, Jupiter). External security audit across EVM and
                  Solana contracts. Multi-chain portfolio view.
                </p>
              </div>
              <div className="m-roadmap-phase">
                <div className="m-roadmap-dot gold-dot" />
                <div className="m-roadmap-label gold-text">
                  Phase 5 — Token Launch
                </div>
                <h4>$CAPULLO &amp; Mainnet</h4>
                <p>
                  $CAPULLO token launch on Ethereum with veToken locking, bridged to
                  supported chains. Alas-to-$CAPULLO airdrop for early users.
                  Liquidity-as-a-Service (Colmena) for projects. Bug bounty on Immunefi.
                  Phased vault deployment across all supported chains.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* FAQ */}
        <FaqSection />

        {/* FOOTER */}
        <footer className="m-footer">
          <div className="m-footer-inner">
            <div className="m-footer-logo">Mariposa Finance</div>
            <div className="m-footer-links">
              <a href="#">Discord</a>
              <a href="#">Twitter/X</a>
              <a href="#">GitHub</a>
              <a href="#">Docs</a>
              <a href="#">Medium</a>
            </div>
            <p className="m-footer-copy">
              &copy; 2026 Mariposa Finance. From cocoon to butterfly.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
