// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

const AGG_LABELS: Record<string, string> = {
  "0x": "0x Protocol",
  velora: "Velora / ParaSwap",
  "1inch": "1inch",
};

const REFRESH_INTERVAL_SEC = 15;

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
  const [toAmount, setToAmount] = useState("");
  const [slippage, setSlippage] = useState(2);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [selectedChain, setSelectedChain] = useState<EvmChainId>(8453);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [preferredAggregator, setPreferredAggregator] = useState<"0x" | "velora" | "auto">("auto");
  const [refreshCountdown, setRefreshCountdown] = useState<number | null>(null);

  // Refs so callbacks don't need stale deps
  const quoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quoteRef = useRef(quote);
  const fromTokenRef = useRef(fromToken);
  const toTokenRef = useRef(toToken);
  useEffect(() => { quoteRef.current = quote; }, [quote]);
  useEffect(() => { fromTokenRef.current = fromToken; }, [fromToken]);
  useEffect(() => { toTokenRef.current = toToken; }, [toToken]);

  // Fetch token balance for "from" token (native-aware, chain-aware)
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
        const tokenData = result.data as { tokens?: Record<string, TokenInfo> };
        if (tokenData?.tokens) {
          setTokens(Object.values(tokenData.tokens));
        }
      } catch { /* leave empty */ }
      finally { if (!cancelled) setIsLoadingTokens(false); }
    }
    loadTokens();
    return () => { cancelled = true; };
  }, [selectedChain]);

  // Reset selections when chain changes
  useEffect(() => {
    setFromToken(null);
    setToToken(null);
    setAmount("");
    setToAmount("");
    setRefreshCountdown(null);
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    reset();
  }, [selectedChain, reset]);

  // ─── Core quote runner ──────────────────────────────────────────
  // Called directly — never put quote/toAmount/amount in its deps to avoid loops.
  const runQuote = useCallback(async (
    fromTok: TokenInfo,
    toTok: TokenInfo,
    sellAmount: string,
    quoteSlippage: number,
    chainId: EvmChainId,
    agg: "0x" | "velora" | "auto",
  ) => {
    setIsQuoting(true);
    try {
      const amountWei = parseUnits(sellAmount, fromTok.decimals).toString();
      const result = await fetchQuote({
        src: fromTok.address,
        dst: toTok.address,
        amount: amountWei,
        slippage: quoteSlippage,
        chainId,
        aggregator: agg,
      });
      if (result) {
        const received = formatUnits(BigInt(result.toAmount), toTok.decimals);
        setToAmount(parseFloat(received).toFixed(6));
      }
    } finally {
      setIsQuoting(false);
    }
  }, [fetchQuote]);

  // ─── Refresh countdown ──────────────────────────────────────────
  const startRefreshCountdown = useCallback((
    fromTok: TokenInfo,
    toTok: TokenInfo,
    sellAmt: string,
    quoteSlippage: number,
    chainId: EvmChainId,
    agg: "0x" | "velora" | "auto",
  ) => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    let remaining = REFRESH_INTERVAL_SEC;
    setRefreshCountdown(remaining);
    refreshTimerRef.current = setInterval(() => {
      remaining -= 1;
      setRefreshCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(refreshTimerRef.current!);
        refreshTimerRef.current = null;
        setRefreshCountdown(null);
        void runQuote(fromTok, toTok, sellAmt, quoteSlippage, chainId, agg).then(() => {
          // restart countdown after refresh
          startRefreshCountdown(fromTok, toTok, sellAmt, quoteSlippage, chainId, agg);
        });
      }
    }, 1000);
  }, [runQuote]);

  // ─── Schedule a quote after user input (debounced 1.5s) ─────────
  const scheduleQuote = useCallback((
    fromTok: TokenInfo | null,
    toTok: TokenInfo | null,
    sellAmt: string,
    quoteSlippage: number,
    chainId: EvmChainId,
    agg: "0x" | "velora" | "auto",
    delayMs = 1500,
  ) => {
    if (refreshTimerRef.current) { clearInterval(refreshTimerRef.current); refreshTimerRef.current = null; }
    setRefreshCountdown(null);
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);

    if (!fromTok || !toTok || !sellAmt || parseFloat(sellAmt) <= 0) return;

    quoteTimerRef.current = setTimeout(async () => {
      await runQuote(fromTok, toTok, sellAmt, quoteSlippage, chainId, agg);
      startRefreshCountdown(fromTok, toTok, sellAmt, quoteSlippage, chainId, agg);
    }, delayMs);
  }, [runQuote, startRefreshCountdown]);

  // ─── Input handlers — only these trigger new quotes ─────────────
  const handleFromAmountChange = useCallback((val: string) => {
    setAmount(val);
    setToAmount("");
    scheduleQuote(fromTokenRef.current, toTokenRef.current, val, slippage, selectedChain, preferredAggregator);
  }, [slippage, selectedChain, preferredAggregator, scheduleQuote]);

  const handleToAmountChange = useCallback((val: string) => {
    setToAmount(val);
    if (!val) { setAmount(""); return; }
    // Reverse: estimate sell amount from last known rate
    const rate = quoteRef.current ? parseFloat(quoteRef.current.exchangeRate) : 0;
    if (rate > 0 && fromTokenRef.current) {
      const estimated = (parseFloat(val) / rate).toFixed(fromTokenRef.current.decimals > 6 ? 6 : fromTokenRef.current.decimals);
      setAmount(estimated);
      scheduleQuote(fromTokenRef.current, toTokenRef.current, estimated, slippage, selectedChain, preferredAggregator);
    }
  }, [slippage, selectedChain, preferredAggregator, scheduleQuote]);

  const handleTokenChange = useCallback((
    newFrom: TokenInfo | null,
    newTo: TokenInfo | null,
    currentAmount: string,
  ) => {
    scheduleQuote(newFrom, newTo, currentAmount, slippage, selectedChain, preferredAggregator, 800);
  }, [slippage, selectedChain, preferredAggregator, scheduleQuote]);

  const handleFlip = useCallback(() => {
    const prevFrom = fromToken;
    const prevTo = toToken;
    const prevAmount = toAmount;
    setFromToken(prevTo);
    setToToken(prevFrom);
    setAmount(prevAmount);
    setToAmount(amount);
    scheduleQuote(prevTo, prevFrom, prevAmount, slippage, selectedChain, preferredAggregator, 800);
    reset();
  }, [fromToken, toToken, amount, toAmount, slippage, selectedChain, preferredAggregator, scheduleQuote, reset]);

  const handleMaxClick = useCallback(() => {
    if (!fromBalance || !fromToken) return;
    const formatted = formatUnits(fromBalance as bigint, fromToken.decimals);
    setAmount(formatted);
    setToAmount("");
    scheduleQuote(fromToken, toToken, formatted, slippage, selectedChain, preferredAggregator);
  }, [fromBalance, fromToken, toToken, slippage, selectedChain, preferredAggregator, scheduleQuote]);

  const handleAggregatorChange = useCallback((agg: "0x" | "velora") => {
    setPreferredAggregator(agg);
    if (fromToken && toToken && amount) {
      scheduleQuote(fromToken, toToken, amount, slippage, selectedChain, agg, 300);
    }
  }, [fromToken, toToken, amount, slippage, selectedChain, scheduleQuote]);

  const handleSlippageChange = useCallback((val: number) => {
    setSlippage(val);
    scheduleQuote(fromTokenRef.current, toTokenRef.current, amount, val, selectedChain, preferredAggregator, 800);
  }, [amount, selectedChain, preferredAggregator, scheduleQuote]);

  // Fee breakdown
  const feeBreakdown = useMemo(() => {
    if (!quote || !fromToken) return null;
    const sellAmt = parseFloat(formatUnits(BigInt(quote.fromAmount), fromToken.decimals));
    const feeAmt = sellAmt * 0.0015;
    return { tokenAmt: feeAmt.toFixed(6), symbol: fromToken.symbol };
  }, [quote, fromToken]);

  const isWrongChain = isConnected && walletChainId !== undefined && walletChainId !== selectedChain;
  const canSwap = isConnected && !isWrongChain && fromToken && toToken && amount && quote && !isPending && !isConfirming;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-2xl border border-border bg-card p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Smart Swap</h2>
          <div className="flex items-center gap-2">
            {/* Refresh countdown */}
            {refreshCountdown !== null && !isQuoting && (
              <span className="text-xs text-muted-foreground tabular-nums">
                ↻ {refreshCountdown}s
              </span>
            )}
            {isQuoting && (
              <svg className="h-3.5 w-3.5 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            <SlippageSettings slippage={slippage} onSlippageChange={handleSlippageChange} />
          </div>
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
            {fromBalance !== undefined && fromToken && (
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
              onChange={(e) => handleFromAmountChange(e.target.value)}
              className="border-0 bg-transparent text-2xl font-semibold p-0 h-auto focus-visible:ring-0"
              min={0}
              step="any"
            />
            <TokenSelector
              tokens={tokens}
              selectedToken={fromToken}
              onSelect={(t) => { setFromToken(t); handleTokenChange(t, toToken, amount); }}
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
            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To Token — editable */}
        <div className="rounded-xl bg-secondary p-4 mt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">You receive</span>
            {isQuoting && (
              <span className="text-xs text-muted-foreground animate-pulse">fetching...</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              placeholder={isQuoting ? "..." : "0.0"}
              value={toAmount}
              onChange={(e) => handleToAmountChange(e.target.value)}
              className="border-0 bg-transparent text-2xl font-semibold p-0 h-auto focus-visible:ring-0"
              min={0}
              step="any"
            />
            <TokenSelector
              tokens={tokens}
              selectedToken={toToken}
              onSelect={(t) => { setToToken(t); handleTokenChange(fromToken, t, amount); }}
              label="Select"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 opacity-60">
            Enter an amount to receive — we&apos;ll calculate what you need to pay
          </p>
        </div>

        {/* Quote Details */}
        {quote && (
          <div className="mt-4 rounded-xl border border-border p-4 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Rate</span>
              <span>1 {fromToken?.symbol} = {parseFloat(quote.exchangeRate).toFixed(6)} {toToken?.symbol}</span>
            </div>
            {quote.priceImpact !== undefined && (
              <div className="flex justify-between text-muted-foreground">
                <span>Price Impact</span>
                <span className={quote.priceImpact > 3 ? "text-red-400" : quote.priceImpact > 1 ? "text-amber-400" : "text-green-400"}>
                  {quote.priceImpact.toFixed(2)}%
                </span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Est. Gas</span>
              <span>{quote.estimatedGas.toLocaleString()} gas</span>
            </div>
            {feeBreakdown && (
              <div className="flex justify-between text-muted-foreground">
                <span>Mariposa Fee (0.15%)</span>
                <span>{feeBreakdown.tokenAmt} {feeBreakdown.symbol}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Slippage</span>
              <span>{slippage}%</span>
            </div>
          </div>
        )}

        {/* Aggregator Comparison — clickable */}
        {allQuotes && allQuotes.length > 0 && (
          <div className="mt-4 rounded-xl border border-border p-3 space-y-1.5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Route Comparison</p>
              {preferredAggregator !== "auto" && (
                <button onClick={() => setPreferredAggregator("auto")} className="text-xs text-primary hover:underline">
                  Use best
                </button>
              )}
            </div>
            {allQuotes.map((q, i) => {
              const isBest = q.success && i === allQuotes.findIndex(x => x.success);
              const isSelected = preferredAggregator === q.aggregator;
              const label = AGG_LABELS[q.aggregator] ?? q.aggregator;
              return (
                <button
                  key={i}
                  onClick={() => { if (q.success) handleAggregatorChange(q.aggregator as "0x" | "velora"); }}
                  disabled={!q.success}
                  className={[
                    "w-full flex items-center justify-between text-xs rounded-lg px-3 py-2 transition-colors",
                    q.success ? "cursor-pointer hover:bg-secondary" : "opacity-40 cursor-not-allowed",
                    isSelected ? "bg-primary/10 border border-primary/30" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground/80">{label}</span>
                    {isBest && preferredAggregator === "auto" && (
                      <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">best</span>
                    )}
                    {isSelected && preferredAggregator !== "auto" && (
                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">selected</span>
                    )}
                    {q.success && q.sources && q.sources.length > 0 && (
                      <span className="text-muted-foreground/50">{q.sources.slice(0, 2).join(", ")}</span>
                    )}
                  </div>
                  {q.success && q.buyAmount && toToken ? (
                    <span className="font-mono text-foreground/70">
                      {parseFloat((Number(q.buyAmount) / Math.pow(10, toToken.decimals)).toFixed(6)).toString()} {toToken.symbol}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40 text-[11px]">{q.error ? "failed" : "unavailable"}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Swap Button */}
        <div className="mt-4">
          {!isConnected ? (
            <div className="w-full flex justify-center"><ConnectButton /></div>
          ) : isSuccess ? (
            <Button className="w-full h-12 text-base" onClick={() => { reset(); setAmount(""); setToAmount(""); setRefreshCountdown(null); }}>
              Swap Again
            </Button>
          ) : (
            <Button className="w-full h-12 text-base" disabled={!canSwap} onClick={executeSwap}>
              {isPending ? "Waiting for wallet..."
                : isConfirming ? "Confirming..."
                : isWrongChain ? `Switch to ${CHAIN_OPTIONS.find(c => c.id === selectedChain)?.name ?? "correct"} network`
                : !fromToken || !toToken ? "Select tokens"
                : !amount ? "Enter amount"
                : isQuoting ? "Getting quote..."
                : !quote ? "Swap"
                : "Swap"}
            </Button>
          )}
        </div>

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

        <div className="mt-4 flex flex-col gap-1 text-xs text-muted-foreground text-center">
          <span>Smart Routing — best price across 0x, Velora/ParaSwap</span>
          <span>Mariposa fee: 0.15%</span>
        </div>
      </div>
    </div>
  );
}
