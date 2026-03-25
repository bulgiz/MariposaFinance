// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { ConditionalShell } from "@/components/conditional-shell";
import "./globals.css";

export const metadata: Metadata = {
  other: {
    "talentapp:project_verification": "261ac89e8b1cea89c594f41bedfe84e749e2f4dd7e67029a56db0119ed2a9b048644efcd5e4086db54c32a5202073483a72eb024689e23073d6fc54a0dd5b707",
  },
  title:
    "Mariposa Finance — Multi-Chain DeFi Yield Aggregator | Auto-Compounding Vaults",
  description:
    "Mariposa Finance is a next-generation multi-chain DeFi yield aggregator. Auto-compounding vaults (Jardines) across Base, Arbitrum, Ethereum, Solana, and 9+ chains. Earn the best yields effortlessly with ZAP deposits, DEX aggregation, and the $CAPULLO governance token.",
  keywords: [
    "DeFi yield aggregator",
    "auto-compounding vaults",
    "yield farming",
    "Base",
    "Arbitrum",
    "Ethereum",
    "Solana",
    "multi-chain DeFi",
    "DEX aggregator",
    "$CAPULLO token",
    "Mariposa Finance",
    "Jardines vaults",
    "liquidity farming",
    "DeFi portfolio tracker",
    "best DeFi yields",
    "cross-chain yield optimizer",
    "Mariposa Connect",
    "encrypted messenger",
    "relay staking",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <Providers>
          <ConditionalShell>{children}</ConditionalShell>
        </Providers>
      </body>
    </html>
  );
}
