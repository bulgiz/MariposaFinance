// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { useState, useCallback } from "react";
import {
  useAccount,
  useSendTransaction,
  useWriteContract,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { maxUint256 } from "viem";
import { config } from "@/lib/wagmi";
import { fetchSwapQuote } from "@/lib/api";
import { erc20Abi } from "@mariposa/chain-adapters";
import type { SwapQuoteResponse } from "@mariposa/core";

/** Native token address placeholder */
const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

type SwapStatus = "idle" | "pending" | "confirming" | "success" | "failed";

export function useSwap() {
  const { address, chainId: walletChainId } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const [quote, setQuote] = useState<SwapQuoteResponse | null>(null);
  const [allQuotes, setAllQuotes] = useState<SwapQuoteResponse["allQuotes"]>(undefined);
  const [status, setStatus] = useState<SwapStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const isPending = status === "pending";
  const isConfirming = status === "confirming";
  const isSuccess = status === "success";

  /**
   * Fetch a swap quote. Uses `chainId` param (the UI-selected chain) so
   * quotes work even before the wallet is connected or before chain-switch.
   * `from` falls back to a zero address if wallet not connected — 0x/Velora
   * accept any valid address for price quotes.
   */
  const fetchQuote = useCallback(
    async (params: {
      src: string;
      dst: string;
      amount: string;
      slippage: number;
      chainId: number;
      aggregator?: '0x' | 'velora' | 'auto';
    }) => {
      setError(null);
      try {
        // vitalik.eth — checksummed, accepted by 0x (>0xffff) and Velora for price preview
        const from = address ?? "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
        const result = await fetchSwapQuote({
          src: params.src,
          dst: params.dst,
          amount: params.amount,
          from,
          slippage: params.slippage,
          chainId: params.chainId,
          aggregator: params.aggregator,
        });
        setQuote(result.data);
        setAllQuotes(result.data.allQuotes);
        return result.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch quote";
        setError(message);
        return null;
      }
    },
    [address]
  );

  /**
   * Check if an ERC20 approval is needed and approve if so.
   */
  const ensureApproval = useCallback(
    async (tokenAddress: string, spender: string) => {
      if (!address || !walletChainId) return;
      if (tokenAddress.toLowerCase() === NATIVE_TOKEN.toLowerCase()) return;

      const approveTx = await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender as `0x${string}`, maxUint256],
        chainId: walletChainId as 8453 | 42161,
      });

      await waitForTransactionReceipt(config, {
        hash: approveTx,
        confirmations: 1,
      });
    },
    [address, walletChainId, writeContractAsync]
  );

  /**
   * Execute the swap. Requires wallet connected and on the same chain as the quote.
   */
  const executeSwap = useCallback(async () => {
    if (!quote || !address) {
      setError("No quote available or wallet not connected");
      return;
    }

    setError(null);
    setStatus("pending");

    try {
      const srcAddress = quote.fromToken?.address;
      if (srcAddress && srcAddress.toLowerCase() !== NATIVE_TOKEN.toLowerCase()) {
        await ensureApproval(srcAddress, quote.tx.to);
      }

      setStatus("confirming");
      const txHash = await sendTransactionAsync({
        to: quote.tx.to as `0x${string}`,
        data: quote.tx.data as `0x${string}`,
        value: BigInt(quote.tx.value),
        gas: BigInt(quote.tx.gas),
      });

      await waitForTransactionReceipt(config, {
        hash: txHash,
        confirmations: 1,
      });

      setStatus("success");
    } catch (err) {
      setStatus("failed");
      const message =
        err instanceof Error ? err.message : "Swap transaction failed";
      setError(message);
    }
  }, [quote, address, sendTransactionAsync, ensureApproval]);

  const reset = useCallback(() => {
    setQuote(null);
    setAllQuotes(undefined);
    setStatus("idle");
    setError(null);
  }, []);

  return {
    quote,
    allQuotes,
    fetchQuote,
    executeSwap,
    reset,
    isPending,
    isConfirming,
    isSuccess,
    status,
    error,
    walletChainId,
  };
}
