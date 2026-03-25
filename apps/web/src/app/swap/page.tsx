// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { Component, type ReactNode } from "react";
import { SwapWidget } from "@/components/swap/swap-widget";
import { ENABLE_SWAP } from "@/config/features";

class SwapErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-md rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h2 className="font-semibold mb-1">Swap widget failed to load</h2>
          <p className="text-sm text-muted-foreground mb-4">{this.state.message}</p>
          <button
            className="text-sm text-primary underline"
            onClick={() => this.setState({ hasError: false, message: "" })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
      <SwapErrorBoundary>
        <SwapWidget />
      </SwapErrorBoundary>
    </div>
  );
}
