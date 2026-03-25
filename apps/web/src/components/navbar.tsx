// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { fetchProfile } from "@/lib/alas-api";

function AlasBalance({ address }: { address: string }) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchProfile(address)
      .then((p) => setBalance(p.total_alas))
      .catch(() => setBalance(null));
  }, [address]);

  if (balance === null) return null;

  return (
    <Link
      href="/alas"
      className="hidden sm:flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
    >
      🦋 <span className="font-semibold">{balance}</span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();

  const linkClass = (href: string) =>
    `text-sm transition-colors ${
      pathname === href
        ? "text-foreground font-medium"
        : "text-muted-foreground hover:text-foreground"
    }`;

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
            <Link href="/jardines" className={linkClass("/jardines")}>
              Jardines
            </Link>
            <Link href="/swap" className={linkClass("/swap")}>
              Swap
            </Link>
            <Link href="/portfolio" className={linkClass("/portfolio")}>
              Portfolio
            </Link>
            <Link href="/alas" className={`${linkClass("/alas")} flex items-center gap-1`}>
              <span>Alas</span>
              <span className="text-xs">✨</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isConnected && address && <AlasBalance address={address} />}
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
