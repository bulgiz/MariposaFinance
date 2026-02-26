"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePortfolio } from "@/hooks/use-pools";
import { PositionCard } from "@/components/position-card";
import { formatUsd } from "@mariposa/core";
import { Skeleton } from "@mariposa/ui";

export default function PortfolioPage() {
  const { isConnected, address } = useAccount();
  const { data, isLoading, error } = usePortfolio(address);

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
          {isLoading ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-44 rounded-xl" />
                ))}
              </div>
            </>
          ) : error ? (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center">
              <p className="text-destructive font-medium">
                Failed to load portfolio
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {error.message}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <div className="text-3xl font-bold text-accent">
                    {formatUsd(data?.data.totalValue ?? 0)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Total Value
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <div className="text-3xl font-bold text-emerald-500">
                    {formatUsd(data?.data.totalEarned ?? 0)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Total Earned
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <div className="text-3xl font-bold">
                    {data?.data.positions.length ?? 0}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Active Positions
                  </div>
                </div>
              </div>

              {data?.data.positions.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-12 text-center">
                  <p className="text-muted-foreground">
                    No positions found for {address?.slice(0, 6)}...
                    {address?.slice(-4)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Deposit into a{" "}
                    <a
                      href="/jardines"
                      className="text-primary hover:underline"
                    >
                      Jardin
                    </a>{" "}
                    to see your positions here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {data?.data.positions.map((position, i) => (
                    <PositionCard key={position.pool.id + i} position={position} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
