// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { SwapWidget } from "@/components/swap/swap-widget";
import { ENABLE_SWAP } from "@/config/features";

export default function SwapPage() {
  if (!ENABLE_SWAP) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="text-4xl mb-4">🦋</div>
        <h1 className="text-2xl font-bold mb-2">Swap — Coming Soon</h1>
        <p className="text-muted-foreground">
          Token swap functionality is not yet available. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-md text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Mariposa Smart Swap</h1>
        <p className="text-muted-foreground">
          Swap tokens across 9 EVM chains with the best rates. Smart routing
          queries multiple aggregators in parallel and picks the best price for
          you — just 0.15% fee.
        </p>
      </div>
      <SwapWidget />
    </div>
  );
}
