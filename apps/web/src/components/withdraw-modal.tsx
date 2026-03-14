// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { useState, useCallback } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import type { Pool, Position } from "@mariposa/core";
import { formatUsd } from "@mariposa/core";
import { Button, Input } from "@mariposa/ui";
import { useWithdraw } from "@/hooks/use-transactions";
import { TransactionSteps } from "./transaction-steps";

interface WithdrawModalProps {
  pool: Pool;
  position?: Position;
  isOpen: boolean;
  onClose: () => void;
}

export function WithdrawModal({
  pool,
  position,
  isOpen,
  onClose,
}: WithdrawModalProps) {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const isLending = pool.type === "lending";

  const [amount, setAmount] = useState("");

  const { withdraw, steps, isTransacting } = useWithdraw({
    pool,
    onSuccess: () => {
      setAmount("");
    },
  });

  const handleWithdraw = useCallback(async () => {
    if (chainId !== pool.chain) {
      try {
        await switchChainAsync({ chainId: pool.chain });
      } catch {
        return;
      }
    }

    const token = pool.tokens[0];
    const decimals = isLending ? (token?.decimals ?? 18) : 18;
    await withdraw(amount, decimals);
  }, [chainId, pool, switchChainAsync, amount, isLending, withdraw]);

  const handleMax = useCallback(() => {
    if (!position) return;
    if (isLending) {
      // For lending, use the deposited USD value / token price to get token amount
      const token = pool.tokens[0];
      if (token?.priceUsd && token.priceUsd > 0) {
        setAmount((position.deposited / token.priceUsd).toFixed(6));
      }
    } else {
      // For DEX, the "amount" is in LP token terms
      // Use a simple approximation from position data
      const positionToken = position.tokens[0];
      if (positionToken) {
        setAmount(positionToken.amount.toFixed(6));
      }
    }
  }, [position, pool, isLending]);

  const hasAmount = Number(amount) > 0;
  const isAllDone = steps.length > 0 && steps.every((s) => s.status === "confirmed");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {isLending ? "Withdraw" : "Remove Liquidity"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          {pool.name} on {pool.chain === 8453 ? "Base" : "Arbitrum"}
        </div>

        {/* Current Position Info */}
        {position && (
          <div className="rounded-lg bg-secondary/50 p-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your position</span>
              <span className="font-medium">{formatUsd(position.deposited)}</span>
            </div>
            {position.earned > 0 && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Earned</span>
                <span className="font-medium text-green-400">
                  +{formatUsd(position.earned)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Amount Input */}
        <div className="rounded-lg bg-secondary p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {isLending ? pool.tokens[0]?.symbol ?? "Token" : "LP Amount"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isTransacting}
              className="bg-transparent border-0 text-lg font-mono p-0 h-auto focus-visible:ring-0"
            />
            {position && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMax}
                disabled={isTransacting}
                className="text-xs text-primary"
              >
                MAX
              </Button>
            )}
          </div>
        </div>

        {/* Transaction Steps */}
        <TransactionSteps steps={steps} chainId={pool.chain} />

        {/* Action Buttons */}
        <div className="mt-6 space-y-2">
          {!address ? (
            <div className="text-center text-sm text-muted-foreground py-2">
              Connect your wallet to withdraw
            </div>
          ) : isAllDone ? (
            <Button onClick={onClose} className="w-full" variant="accent">
              Done
            </Button>
          ) : chainId !== pool.chain ? (
            <Button
              onClick={() => switchChainAsync({ chainId: pool.chain })}
              className="w-full"
            >
              Switch to {pool.chain === 8453 ? "Base" : "Arbitrum"}
            </Button>
          ) : (
            <Button
              onClick={handleWithdraw}
              disabled={!hasAmount || isTransacting}
              className="w-full"
              variant="destructive"
            >
              {isTransacting
                ? "Processing..."
                : isLending
                  ? "Withdraw"
                  : "Remove Liquidity"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
