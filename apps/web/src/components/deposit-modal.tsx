"use client";

import { useState, useCallback } from "react";
import { formatUnits } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import type { Pool } from "@mariposa/core";
import { formatUsd } from "@mariposa/core";
import { Button, Input } from "@mariposa/ui";
import { useTokenBalance, useDeposit } from "@/hooks/use-transactions";
import { TransactionSteps } from "./transaction-steps";

interface DepositModalProps {
  pool: Pool;
  isOpen: boolean;
  onClose: () => void;
}

export function DepositModal({ pool, isOpen, onClose }: DepositModalProps) {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const isLending = pool.type === "lending";

  // Token amounts (for DEX pools, we need two inputs)
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");

  const token0 = pool.tokens[0];
  const token1 = pool.tokens[1];

  // Fetch balances
  const { data: balance0 } = useTokenBalance(token0?.address, address);
  const { data: balance1 } = useTokenBalance(
    isLending ? undefined : token1?.address,
    address
  );

  const { deposit, steps, isTransacting } = useDeposit({
    pool,
    onSuccess: () => {
      setAmount0("");
      setAmount1("");
    },
  });

  const handleDeposit = useCallback(async () => {
    // Switch chain if needed
    if (chainId !== pool.chain) {
      try {
        await switchChainAsync({ chainId: pool.chain });
      } catch {
        return;
      }
    }

    const amounts = isLending ? [amount0] : [amount0, amount1];
    const decimals = isLending
      ? [token0?.decimals ?? 18]
      : [token0?.decimals ?? 18, token1?.decimals ?? 18];

    await deposit(amounts, decimals);
  }, [
    chainId,
    pool,
    switchChainAsync,
    amount0,
    amount1,
    isLending,
    token0,
    token1,
    deposit,
  ]);

  const handleMax0 = useCallback(() => {
    if (balance0 && token0) {
      setAmount0(formatUnits(balance0, token0.decimals));
    }
  }, [balance0, token0]);

  const handleMax1 = useCallback(() => {
    if (balance1 && token1) {
      setAmount1(formatUnits(balance1, token1.decimals));
    }
  }, [balance1, token1]);

  const hasAmount = isLending
    ? Number(amount0) > 0
    : Number(amount0) > 0 && Number(amount1) > 0;

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
            {isLending ? "Supply" : "Add Liquidity"}
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

        {/* Token 0 Input */}
        {token0 && (
          <div className="rounded-lg bg-secondary p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{token0.symbol}</span>
              <span className="text-xs text-muted-foreground">
                Balance:{" "}
                {balance0
                  ? Number(formatUnits(balance0, token0.decimals)).toFixed(4)
                  : "0.0000"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="0.0"
                value={amount0}
                onChange={(e) => setAmount0(e.target.value)}
                disabled={isTransacting}
                className="bg-transparent border-0 text-lg font-mono p-0 h-auto focus-visible:ring-0"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMax0}
                disabled={isTransacting}
                className="text-xs text-primary"
              >
                MAX
              </Button>
            </div>
            {token0.priceUsd && Number(amount0) > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {formatUsd(Number(amount0) * token0.priceUsd)}
              </div>
            )}
          </div>
        )}

        {/* Token 1 Input (DEX pools only) */}
        {!isLending && token1 && (
          <div className="rounded-lg bg-secondary p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{token1.symbol}</span>
              <span className="text-xs text-muted-foreground">
                Balance:{" "}
                {balance1
                  ? Number(formatUnits(balance1, token1.decimals)).toFixed(4)
                  : "0.0000"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="0.0"
                value={amount1}
                onChange={(e) => setAmount1(e.target.value)}
                disabled={isTransacting}
                className="bg-transparent border-0 text-lg font-mono p-0 h-auto focus-visible:ring-0"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMax1}
                disabled={isTransacting}
                className="text-xs text-primary"
              >
                MAX
              </Button>
            </div>
            {token1.priceUsd && Number(amount1) > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {formatUsd(Number(amount1) * token1.priceUsd)}
              </div>
            )}
          </div>
        )}

        {/* Transaction Steps */}
        <TransactionSteps steps={steps} chainId={pool.chain} />

        {/* Action Buttons */}
        <div className="mt-6 space-y-2">
          {!address ? (
            <div className="text-center text-sm text-muted-foreground py-2">
              Connect your wallet to deposit
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
              onClick={handleDeposit}
              disabled={!hasAmount || isTransacting}
              className="w-full"
            >
              {isTransacting
                ? "Processing..."
                : isLending
                  ? `Supply ${token0?.symbol ?? ""}`
                  : "Add Liquidity"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
