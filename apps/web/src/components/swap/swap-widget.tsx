// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, formatUnits } from "viem";
import { Button, Input, Badge } from "@mariposa/ui";
import { useSwap } from "@/hooks/use-swap";
import { useTokenBalance } from "@/hooks/use-transactions";
import { fetchSwapTokens } from "@/lib/api";
import { TokenSelector } from "./token-selector";
import { SlippageSettings } from "./slippage-settings";
import type { TokenInfo, EvmChainId } from "@mariposa/core";

const CHAIN_OPTIONS: { id: EvmChainId; name: string }[] = [
  { id: 8453, name: "Base" },
  { id: 42161, name: "Arbitrum" },
  { id: 1, name: "Ethereum" },
  { id: 10, name: "Optimism" },
  { id: 137, name: "Polygon" },
  { id: 56, name: "BNB" },
  { id: 43114, name: "Avalanche" },
];

export function SwapWidget() {
  const { address, isConnected } = useAccount();
  const {
    quote,
    allQuotes,
    fetchQuote,
    executeSwap,
    reset,
    isPending,
    isConfirming,
    isSuccess,
    error,
    walletChainId,
  } = useSwap();

  const [fromToken, setFromToken] = useState<TokenInfo | null>(null);
  const [toToken, setToToken] = useState<TokenInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(2);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [selectedChain, setSelectedChain] = useState<EvmChainId>(8453);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);

  // Fetch token balance for "from" token (use selectedChain so it works before wallet switch)
  const { data: fromBalance } = useTokenBalance(
    fromToken?.address,
    address,
    selectedChain
  );

  // Load tokens for the selected chain
  useEffect(() => {
    let cancelled = false;

    async function loadTokens() {
      setIsLoadingTokens(true);
      try {
        const result = await fetchSwapTokens(selectedChain);
        if (cancelled) return;

        // 1inch returns tokens as { tokens: { [address]: TokenInfo } }
        const tokenData = result.data as { tokens?: Record<string, TokenInfo> };
        if (tokenData?.tokens) {
          const tokenList = Object.values(tokenData.tokens);
          setTokens(tokenList);
        }
      } catch {
        // Token list failed to load — leave empty
      } finally {
        if (!cancelled) setIsLoadingTokens(false);
      }
    }

    loadTokens();
    return () => {
      cancelled = true;
    };
  }, [selectedChain]);

  // Reset selections when chain changes
  useEffect(() => {
    setFromToken(null);
    setToToken(null);
    setAmount("");
    reset();
  }, [selectedChain, reset]);

  // Fetch quote when inputs change (debounced)
  useEffect(() => {
    if (!fromToken || !toToken || !amount) return;

    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;

    const timeout = setTimeout(async () => {
      setIsQuoting(true);
      try {
        const amountWei = parseUnits(amount, fromToken.decimals).toString();
        await fetchQuote({
          src: fromToken.address,
          dst: toToken.address,
          amount: amountWei,
          slippage,
          chainId: selectedChain,
        });
      } finally {
        setIsQuoting(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [fromToken, toToken, amount, slippage, selectedChain, fetchQuote]);

  const handleFlip = useCallback(() => {
    const prevFrom = fromToken;
    const prevTo = toToken;
    setFromToken(prevTo);
    setToToken(prevFrom);
    setAmount("");
    reset();
  }, [fromToken, toToken, reset]);

  const handleMaxClick = useCallback(() => {
    if (!fromBalance || !fromToken) return;
    const formatted = formatUnits(fromBalance as bigint, fromToken.decimals);
    setAmount(formatted);
  }, [fromBalance, fromToken]);

  const formattedToAmount = useMemo(() => {
    if (!quote || !toToken) return "";
    try {
      const amt = quote.toAmount;
      if (!amt) return "";
      return formatUnits(BigInt(amt), toToken.decimals);
    } catch { return ""; }
  }, [quote, toToken]);

  const isWrongChain = isConnected && walletChainId !== undefined && walletChainId !== selectedChain;
  const canSwap =
    isConnected &&
    !isWrongChain &&
    fromToken &&
    toToken &&
    amount &&
    quote &&
    !isPending &&
    !isConfirming;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-2xl border border-border bg-card p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Smart Swap</h2>
          <SlippageSettings slippage={slippage} onSlippageChange={setSlippage} />
        </div>

        {/* Chain Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {CHAIN_OPTIONS.map((chain) => (
            <Button
              key={String(chain.id)}
              variant={selectedChain === chain.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChain(chain.id)}
            >
              {chain.name}
            </Button>
          ))}
        </div>

        {/* From Token */}
        <div className="rounded-xl bg-secondary p-4 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">You pay</span>
            {fromBalance && fromToken && (
              <button
                onClick={handleMaxClick}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Balance:{" "}
                {parseFloat(
                  formatUnits(fromBalance as bigint, fromToken.decimals)
                ).toFixed(4)}
                <span className="ml-1 text-primary font-medium">MAX</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border-0 bg-transparent text-2xl font-semibold p-0 h-auto focus-visible:ring-0"
              min={0}
              step="any"
            />
            <TokenSelector
              tokens={tokens}
              selectedToken={fromToken}
              onSelect={setFromToken}
              label="Select"
            />
          </div>
        </div>

        {/* Flip Button */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            onClick={handleFlip}
            className="rounded-xl border border-border bg-card p-2 hover:bg-secondary transition-colors"
            aria-label="Swap direction"
          >
            <svg
              className="h-5 w-5 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>

        {/* To Token */}
        <div className="rounded-xl bg-secondary p-4 mt-2">
          <div className="mb-2">
            <span className="text-xs text-muted-foreground">You receive</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 text-2xl font-semibold text-foreground/80 min-h-[2.5rem] flex items-center">
              {isQuoting ? (
                <span className="text-muted-foreground animate-pulse">
                  Fetching quote...
                </span>
              ) : formattedToAmount ? (
                parseFloat(formattedToAmount).toFixed(6)
              ) : (
                <span className="text-muted-foreground">0.0</span>
              )}
            </div>
            <TokenSelector
              tokens={tokens}
              selectedToken={toToken}
              onSelect={setToToken}
              label="Select"
            />
          </div>
        </div>

        {/* Quote Details */}
        {quote && (
          <div className="mt-4 rounded-xl border border-border p-4 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Rate</span>
              <span>
                1 {fromToken?.symbol} = {parseFloat(quote.exchangeRate).toFixed(6)}{" "}
                {toToken?.symbol}
              </span>
            </div>
            {quote.priceImpact !== undefined && (
              <div className="flex justify-between text-muted-foreground">
                <span>Price Impact</span>
                <span
                  className={
                    quote.priceImpact > 3
                      ? "text-red-400"
                      : quote.priceImpact > 1
                      ? "text-amber-400"
                      : "text-green-400"
                  }
                >
                  {quote.priceImpact.toFixed(2)}%
                </span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Est. Gas</span>
              <span>{quote.estimatedGas.toLocaleString()} gas</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Mariposa Fee</span>
              <span>0.15%</span>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <div className="mt-4">
          {!isConnected ? (
            <div className="w-full flex justify-center">
              <ConnectButton />
            </div>
          ) : isSuccess ? (
            <Button
              className="w-full h-12 text-base"
              onClick={() => {
                reset();
                setAmount("");
              }}
            >
              Swap Again
            </Button>
          ) : (
            <Button
              className="w-full h-12 text-base"
              disabled={!canSwap}
              onClick={executeSwap}
            >
              {isPending
                ? "Waiting for wallet..."
                : isConfirming
                ? "Confirming..."
                : isWrongChain
                ? `Switch to ${CHAIN_OPTIONS.find(c => c.id === selectedChain)?.name ?? "correct"} network`
                : !fromToken || !toToken
                ? "Select tokens"
                : !amount
                ? "Enter amount"
                : !quote
                ? isQuoting
                  ? "Getting quote..."
                  : "Swap"
                : "Swap"}
            </Button>
          )}
        </div>

        {/* Status Messages */}
        {isSuccess && (
          <div className="mt-3 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center text-sm text-green-400">
            Swap completed successfully!
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Aggregator Comparison */}
        {allQuotes && allQuotes.length > 0 && (
          <div className="mt-4 rounded-xl border border-border p-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground mb-2">Quote Comparison</p>
            {allQuotes.map((q, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="capitalize font-medium text-foreground/70">{q.aggregator}</span>
                {q.success && q.buyAmount && toToken ? (
                  <span className="text-green-400 font-mono">
                    {parseFloat(
                      (Number(q.buyAmount) / Math.pow(10, toToken.decimals)).toFixed(6)
                    ).toString()}{" "}{toToken.symbol}
                    {i === 0 && <span className="ml-1 text-[10px] bg-green-500/20 text-green-400 px-1 rounded">best</span>}
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">unavailable</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex flex-col gap-1 text-xs text-muted-foreground text-center">
          <span>Smart Routing — best price across 0x, Velora/ParaSwap</span>
          <span>Mariposa fee: 0.15%</span>
        </div>
      </div>
    </div>
  );
}
