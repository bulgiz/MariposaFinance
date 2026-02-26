"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function PortfolioPage() {
  const { isConnected, address } = useAccount();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Portfolio</h1>
        <p className="text-muted-foreground mt-1">
          View your positions across all chains
        </p>
      </div>

      {!isConnected ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to view your DeFi positions across Base and
            Arbitrum.
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="text-3xl font-bold text-accent">$0.00</div>
              <div className="text-sm text-muted-foreground mt-1">
                Total Value
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="text-3xl font-bold text-emerald-500">$0.00</div>
              <div className="text-sm text-muted-foreground mt-1">
                Total Earned
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="text-3xl font-bold">0</div>
              <div className="text-sm text-muted-foreground mt-1">
                Active Positions
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              No positions found for {address?.slice(0, 6)}...
              {address?.slice(-4)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Vault deposits will be available in Phase 2. For now, explore the{" "}
              <a href="/jardines" className="text-primary hover:underline">
                Jardines
              </a>{" "}
              to discover yield opportunities.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
