// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">
              Mariposa
            </span>
            <span className="text-sm text-muted-foreground">Finance</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/jardines"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Jardines
            </Link>
            <Link
              href="/swap"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Swap
            </Link>
            <Link
              href="/portfolio"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Portfolio
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="address"
          />
        </div>
      </div>
    </header>
  );
}
