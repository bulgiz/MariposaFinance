"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { usePool } from "@/hooks/use-pools";
import { formatApy, formatUsd, getChainName } from "@mariposa/core";
import { Badge, Skeleton } from "@mariposa/ui";

export default function PoolDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { data, isLoading, error } = usePool(id);

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

        {pool.url && (
          <div className="border-t border-border pt-6 mt-6">
            <a
              href={pool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              View on {pool.protocol.replace("-", " ")} &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
