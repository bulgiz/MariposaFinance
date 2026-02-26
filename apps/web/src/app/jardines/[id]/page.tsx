"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAccount } from "wagmi";
import { usePool, usePortfolio } from "@/hooks/use-pools";
import { formatApy, formatUsd, getChainName } from "@mariposa/core";
import { Badge, Button, Skeleton } from "@mariposa/ui";
import { DepositModal } from "@/components/deposit-modal";
import { WithdrawModal } from "@/components/withdraw-modal";

export default function PoolDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { data, isLoading, error } = usePool(id);
  const { address } = useAccount();
  const { data: portfolioData } = usePortfolio(address);

  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 text-center">
        <p className="text-destructive text-lg font-medium">Pool not found</p>
        <Link href="/jardines" className="text-primary hover:underline mt-2 inline-block">
          Back to Jardines
        </Link>
      </div>
    );
  }

  const pool = data.data;

  // Find user's position in this pool
  const userPosition = portfolioData?.data.positions.find(
    (p) => p.pool.id === pool.id
  );

  // Check if deposits are supported (skip Uniswap V3 concentrated liquidity)
  const depositsSupported =
    pool.protocol === "aave-v3" ||
    pool.protocol === "aerodrome" ||
    pool.protocol === "camelot";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/jardines"
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        &larr; Back to Jardines
      </Link>

      <div className="rounded-xl border border-border bg-card p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{pool.name}</h1>
              <Badge variant="secondary">{getChainName(pool.chain)}</Badge>
              <Badge variant="outline" className="capitalize">
                {pool.protocol.replace("-", " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Contract: {pool.contractAddress}
            </p>
          </div>

          <div className="text-right">
            <div className="text-4xl font-bold text-accent">
              {formatApy(pool.apy.total)}
            </div>
            <div className="text-sm text-muted-foreground">Total APY</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg bg-secondary p-4">
            <div className="text-lg font-semibold">{formatUsd(pool.tvl)}</div>
            <div className="text-xs text-muted-foreground">TVL</div>
          </div>
          <div className="rounded-lg bg-secondary p-4">
            <div className="text-lg font-semibold">{formatApy(pool.apy.base)}</div>
            <div className="text-xs text-muted-foreground">Base APY</div>
          </div>
          <div className="rounded-lg bg-secondary p-4">
            <div className="text-lg font-semibold">{formatApy(pool.apy.reward)}</div>
            <div className="text-xs text-muted-foreground">Reward APY</div>
          </div>
          <div className="rounded-lg bg-secondary p-4">
            <div className="text-lg font-semibold">{pool.riskScore}/10</div>
            <div className="text-xs text-muted-foreground">Risk Score</div>
          </div>
        </div>

        {/* User Position (if any) */}
        {userPosition && (
          <div className="border-t border-border pt-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">Your Position</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                <div className="text-lg font-semibold">
                  {formatUsd(userPosition.deposited)}
                </div>
                <div className="text-xs text-muted-foreground">Deposited</div>
              </div>
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                <div className="text-lg font-semibold text-green-400">
                  +{formatUsd(userPosition.earned)}
                </div>
                <div className="text-xs text-muted-foreground">Earned</div>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <div className="text-lg font-semibold">
                  {formatUsd(
                    userPosition.deposited *
                      (Math.pow(1 + pool.apy.total / 100, 1 / 365) - 1)
                  )}
                  /day
                </div>
                <div className="text-xs text-muted-foreground">Est. Earnings</div>
              </div>
            </div>
          </div>
        )}

        {/* Tokens */}
        <div className="border-t border-border pt-6">
          <h2 className="text-lg font-semibold mb-3">Tokens</h2>
          <div className="flex gap-3">
            {pool.tokens.map((token) => (
              <div
                key={token.address}
                className="rounded-lg bg-secondary px-4 py-2"
              >
                <span className="font-medium">{token.symbol}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {token.decimals} decimals
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-border pt-6 mt-6 flex flex-wrap gap-3">
          {depositsSupported && (
            <>
              <Button onClick={() => setDepositOpen(true)} size="lg">
                {pool.type === "lending" ? "Supply" : "Deposit"}
              </Button>

              {userPosition && (
                <Button
                  onClick={() => setWithdrawOpen(true)}
                  variant="outline"
                  size="lg"
                >
                  {pool.type === "lending" ? "Withdraw" : "Remove Liquidity"}
                </Button>
              )}
            </>
          )}

          {pool.url && (
            <a
              href={pool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-input bg-transparent px-8 text-sm font-semibold hover:bg-secondary hover:text-secondary-foreground transition-colors"
            >
              View on {pool.protocol.replace("-", " ")} &rarr;
            </a>
          )}
        </div>
      </div>

      {/* Modals */}
      <DepositModal
        pool={pool}
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
      />
      <WithdrawModal
        pool={pool}
        position={userPosition}
        isOpen={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
      />
    </div>
  );
}
