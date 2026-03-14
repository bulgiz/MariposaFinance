// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import Link from "next/link";
import type { Pool } from "@mariposa/core";
import { formatApy, formatUsd, getChainName } from "@mariposa/core";
import { Card, CardContent, Badge } from "@mariposa/ui";

interface PoolCardProps {
  pool: Pool;
}

const protocolColors: Record<string, string> = {
  aerodrome: "bg-blue-600",
  "uniswap-v3": "bg-pink-600",
  camelot: "bg-amber-600",
  "aave-v3": "bg-purple-600",
  sushiswap: "bg-indigo-600",
};

export function PoolCard({ pool }: PoolCardProps) {
  return (
    <Link href={`/jardines/${encodeURIComponent(pool.id)}`}>
      <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">{pool.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {getChainName(pool.chain)}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${protocolColors[pool.protocol] ?? "bg-gray-600"}`}
                />
                <span className="text-sm text-muted-foreground capitalize">
                  {pool.protocol.replace("-", " ")}
                </span>
                {pool.type === "lending" && (
                  <Badge variant="outline" className="text-xs">
                    Lending
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-accent">
                {formatApy(pool.apy.total)}
              </div>
              <div className="text-xs text-muted-foreground">APY</div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
            <div>
              <div className="text-sm font-medium">{formatUsd(pool.tvl)}</div>
              <div className="text-xs text-muted-foreground">TVL</div>
            </div>

            {pool.apy.reward > 0 && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  Base: {formatApy(pool.apy.base)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Rewards: {formatApy(pool.apy.reward)}
                </div>
              </div>
            )}

            <div className="text-right">
              <div className="flex items-center gap-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${
                      i < pool.riskScore ? "bg-amber-500" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Risk {pool.riskScore}/10
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
