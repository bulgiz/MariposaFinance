// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import Link from "next/link";
import type { Position } from "@mariposa/core";
import { formatApy, formatUsd, getChainName } from "@mariposa/core";
import { Card, CardContent, Badge } from "@mariposa/ui";

interface PositionCardProps {
  position: Position;
}

export function PositionCard({ position }: PositionCardProps) {
  const { pool, deposited, earned, tokens } = position;

  return (
    <Link href={`/jardines/${encodeURIComponent(pool.id)}`}>
      <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">{pool.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {getChainName(pool.chain)}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground capitalize">
                {pool.protocol.replace("-", " ")}
              </span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-accent">
                {formatApy(pool.apy.total)}
              </div>
              <div className="text-xs text-muted-foreground">APY</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-lg bg-secondary p-3">
              <div className="text-lg font-semibold">{formatUsd(deposited)}</div>
              <div className="text-xs text-muted-foreground">Deposited</div>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <div className="text-lg font-semibold text-emerald-500">
                {earned > 0 ? "+" : ""}{formatUsd(earned)}
              </div>
              <div className="text-xs text-muted-foreground">Earned</div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-3">
            {tokens.map((token) => (
              <div
                key={token.symbol}
                className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-1 text-xs"
              >
                <span className="font-medium">{token.symbol}</span>
                <span className="text-muted-foreground">
                  {token.amount < 0.01 ? "<0.01" : token.amount.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
