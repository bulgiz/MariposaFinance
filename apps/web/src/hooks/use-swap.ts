// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { useState, useCallback } from "react";
import {
  useAccount,
  useSendTransaction,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { maxUint256, parseUnits } from "viem";
import { config } from "@/lib/wagmi";
import { fetchSwapQuote } from "@/lib/api";
import { erc20Abi } from "@mariposa/chain-adapters";
import type { SwapQuoteResponse } from "@mariposa/core";

/** Native token address placeholder used by 1inch */
const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

type SwapStatus = "idle" | "pending" | "confirming" | "success" | "failed";

export function useSwap() {
  const { address, chainId } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const [quote, setQuote] = useState<SwapQuoteResponse | null>(null);
  const [status, setStatus] = useState<SwapStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const isPending = status === "pending";
  const isConfirming = status === "confirming";
  const isSuccess = status === "success";

  /**
   * Fetch a swap quote from the API proxy.
   */
  const fetchQuote = useCallback(
    async (params: {
      src: string;
      dst: string;
      amount: string;
      slippage: number;
    }) => {
      if (!address || !chainId) {
        setError("Wallet not connected");
        return null;
      }

      setError(null);
      try {
        const result = await fetchSwapQuote({
          src: params.src,
          dst: params.dst,
          amount: params.amount,
          from: address,
          slippage: params.slippage,
          chainId,
        });
        setQuote(result.data);
        return result.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch quote";
        setError(message);
        return null;
      }
    },
    [address, chainId]
  );

  /**
   * Check if an ERC20 approval is needed for the swap and approve if so.
   */
  const ensureApproval = useCallback(
    async (tokenAddress: string, spender: string, amount: bigint) => {
      if (!address) return;

      // Native tokens don't need approval
      if (tokenAddress.toLowerCase() === NATIVE_TOKEN.toLowerCase()) return;

      // Read current allowance using a direct viem call
      // (We can't use useReadContract here since it's inside a callback,
      //  so we use writeContractAsync for the approve step only)
      const approveTx = await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender as `0x${string}`, maxUint256],
        chainId: chainId as 8453 | 42161,
      });

      await waitForTransactionReceipt(config, {
        hash: approveTx,
        confirmations: 1,
      });
    },
    [address, chainId, writeContractAsync]
  );

  /**
   * Execute the swap transaction using the current quote.
   */
  const executeSwap = useCallback(async () => {
    if (!quote || !address) {
      setError("No quote available or wallet not connected");
      return;
    }

    setError(null);
    setStatus("pending");

    try {
      // Step 1: Approve ERC20 if non-native token
      const srcAddress = quote.fromToken.address;
      if (srcAddress.toLowerCase() !== NATIVE_TOKEN.toLowerCase()) {
        await ensureApproval(
          srcAddress,
          quote.tx.to,
          BigInt(quote.fromAmount)
        );
      }

      // Step 2: Send the swap transaction
      setStatus("confirming");
      const txHash = await sendTransactionAsync({
        to: quote.tx.to as `0x${string}`,
        data: quote.tx.data as `0x${string}`,
        value: BigInt(quote.tx.value),
        gas: BigInt(quote.tx.gas),
        chainId: chainId as 8453 | 42161,
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
  }, [quote, address, chainId, sendTransactionAsync, ensureApproval]);

  const reset = useCallback(() => {
    setQuote(null);
    setStatus("idle");
    setError(null);
  }, []);

  return {
    quote,
    fetchQuote,
    executeSwap,
    reset,
    isPending,
    isConfirming,
    isSuccess,
    status,
    error,
  };
}
