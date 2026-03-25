// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { useState, useCallback } from "react";
import {
  useReadContract,
  useWriteContract,
  useAccount,
  useBalance,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { parseUnits, maxUint256 } from "viem";
import { config } from "@/lib/wagmi";
import type { Pool, TransactionStep } from "@mariposa/core";
import { PROTOCOLS } from "@mariposa/core";
import { ENABLE_VAULT_WRITES } from "@/config/features";
import {
  erc20Abi,
  aaveV3PoolAbi,
  aerodromeRouterAbi,
  camelotRouterAbi,
} from "@mariposa/chain-adapters";

// ─── Token Balance Hook ─────────────────────────────────────────

const NATIVE_TOKEN = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

/** Returns the balance of an ERC20 or native token, normalised to a bigint. */
export function useTokenBalance(
  tokenAddress: string | undefined,
  userAddress: string | undefined,
  chainId?: number
) {
  const isNative = tokenAddress?.toLowerCase() === NATIVE_TOKEN;

  // Always call both hooks — React requires unconditional hook calls.
  const nativeResult = useBalance({
    address: userAddress as `0x${string}`,
    chainId: chainId as 1 | 10 | 56 | 137 | 8453 | 42161 | 43114 | undefined,
    query: {
      enabled: !!userAddress && isNative === true,
      refetchInterval: 15_000,
    },
  });

  const erc20Result = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddress as `0x${string}`],
    chainId: chainId as 1 | 10 | 56 | 137 | 8453 | 42161 | 43114 | undefined,
    query: {
      enabled: !!tokenAddress && !!userAddress && isNative === false,
      refetchInterval: 15_000,
    },
  });

  if (isNative) {
    return { ...nativeResult, data: nativeResult.data?.value };
  }
  return erc20Result;
}

// ─── Token Allowance Hook ───────────────────────────────────────

export function useTokenAllowance(
  tokenAddress: string | undefined,
  ownerAddress: string | undefined,
  spenderAddress: string | undefined
) {
  return useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`],
    query: {
      enabled: !!tokenAddress && !!ownerAddress && !!spenderAddress,
      refetchInterval: 10_000,
    },
  });
}

// ─── Get Spender Address ────────────────────────────────────────

function getSpenderAddress(pool: Pool): string {
  if (pool.protocol === "aave-v3") {
    const chainProtocols = PROTOCOLS[pool.chain];
    return chainProtocols.aaveV3.pool;
  }
  if (pool.protocol === "aerodrome") {
    const chainProtocols = PROTOCOLS[pool.chain] as typeof PROTOCOLS[8453];
    return chainProtocols.aerodrome.router;
  }
  if (pool.protocol === "camelot") {
    const chainProtocols = PROTOCOLS[pool.chain] as typeof PROTOCOLS[42161];
    return chainProtocols.camelot.router;
  }
  return pool.contractAddress;
}

// ─── Deposit Hook ───────────────────────────────────────────────

interface UseDepositOptions {
  pool: Pool;
  onSuccess?: () => void;
}

export function useDeposit({ pool, onSuccess }: UseDepositOptions) {
  const { address } = useAccount();
  const [steps, setSteps] = useState<TransactionStep[]>([]);

  const { writeContractAsync } = useWriteContract();

  const spender = getSpenderAddress(pool);

  // Gate behind feature flag — return disabled state when vault writes are off
  if (!ENABLE_VAULT_WRITES) {
    return {
      deposit: async () => {
        /* vault writes disabled */
      },
      steps: [
        {
          action: "deposit" as const,
          label: "Vault deposits are currently disabled (audit in progress)",
          status: "failed" as const,
          error: "Vault deposits are temporarily disabled while smart contracts are being audited.",
        },
      ],
      isTransacting: false,
      spender,
    };
  }

  const updateStep = useCallback(
    (index: number, update: Partial<TransactionStep>) => {
      setSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...update } : s))
      );
    },
    []
  );

  const depositAave = useCallback(
    async (tokenAddress: string, amount: bigint) => {
      if (!address) return;

      const initialSteps: TransactionStep[] = [
        { action: "approve", label: `Approve ${pool.tokens[0]?.symbol ?? "token"}`, status: "idle" },
        { action: "deposit", label: `Supply to Aave`, status: "idle" },
      ];
      setSteps(initialSteps);

      // Step 1: Approve
      updateStep(0, { status: "pending-wallet" });
      try {
        const approveTx = await writeContractAsync({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "approve",
          args: [spender as `0x${string}`, maxUint256],
          chainId: pool.chain,
        });
        updateStep(0, { status: "pending-confirmation", txHash: approveTx });
        await waitForTx(approveTx);
        updateStep(0, { status: "confirmed", txHash: approveTx });
      } catch (err) {
        updateStep(0, {
          status: "failed",
          error: err instanceof Error ? err.message : "Approval failed",
        });
        return;
      }

      // Step 2: Supply
      updateStep(1, { status: "pending-wallet" });
      try {
        const supplyTx = await writeContractAsync({
          address: spender as `0x${string}`,
          abi: aaveV3PoolAbi,
          functionName: "supply",
          args: [
            tokenAddress as `0x${string}`,
            amount,
            address,
            0, // referral code
          ],
          chainId: pool.chain,
        });
        updateStep(1, { status: "pending-confirmation", txHash: supplyTx });
        await waitForTx(supplyTx);
        updateStep(1, { status: "confirmed", txHash: supplyTx });
        onSuccess?.();
      } catch (err) {
        updateStep(1, {
          status: "failed",
          error: err instanceof Error ? err.message : "Supply failed",
        });
      }
    },
    [address, pool, spender, writeContractAsync, updateStep, onSuccess]
  );

  const depositDex = useCallback(
    async (
      tokenAAddress: string,
      tokenBAddress: string,
      amountA: bigint,
      amountB: bigint,
      isStable: boolean
    ) => {
      if (!address) return;

      const tokenASymbol = pool.tokens[0]?.symbol ?? "Token A";
      const tokenBSymbol = pool.tokens[1]?.symbol ?? "Token B";

      const initialSteps: TransactionStep[] = [
        { action: "approve", label: `Approve ${tokenASymbol}`, status: "idle" },
        { action: "approve", label: `Approve ${tokenBSymbol}`, status: "idle" },
        { action: "deposit", label: "Add Liquidity", status: "idle" },
      ];
      setSteps(initialSteps);

      // Step 1: Approve Token A
      updateStep(0, { status: "pending-wallet" });
      try {
        const approveTxA = await writeContractAsync({
          address: tokenAAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "approve",
          args: [spender as `0x${string}`, maxUint256],
          chainId: pool.chain,
        });
        updateStep(0, { status: "pending-confirmation", txHash: approveTxA });
        await waitForTx(approveTxA);
        updateStep(0, { status: "confirmed", txHash: approveTxA });
      } catch (err) {
        updateStep(0, {
          status: "failed",
          error: err instanceof Error ? err.message : "Approval failed",
        });
        return;
      }

      // Step 2: Approve Token B
      updateStep(1, { status: "pending-wallet" });
      try {
        const approveTxB = await writeContractAsync({
          address: tokenBAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "approve",
          args: [spender as `0x${string}`, maxUint256],
          chainId: pool.chain,
        });
        updateStep(1, { status: "pending-confirmation", txHash: approveTxB });
        await waitForTx(approveTxB);
        updateStep(1, { status: "confirmed", txHash: approveTxB });
      } catch (err) {
        updateStep(1, {
          status: "failed",
          error: err instanceof Error ? err.message : "Approval failed",
        });
        return;
      }

      // Step 3: Add Liquidity
      updateStep(2, { status: "pending-wallet" });
      try {
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 min
        const slippage = 50n; // 0.5%
        const minA = (amountA * (10000n - slippage)) / 10000n;
        const minB = (amountB * (10000n - slippage)) / 10000n;

        const routerAbi =
          pool.protocol === "aerodrome" ? aerodromeRouterAbi : camelotRouterAbi;

        const args =
          pool.protocol === "aerodrome"
            ? [
                tokenAAddress as `0x${string}`,
                tokenBAddress as `0x${string}`,
                isStable,
                amountA,
                amountB,
                minA,
                minB,
                address,
                deadline,
              ]
            : [
                tokenAAddress as `0x${string}`,
                tokenBAddress as `0x${string}`,
                amountA,
                amountB,
                minA,
                minB,
                address,
                deadline,
              ];

        const liquidityTx = await writeContractAsync({
          address: spender as `0x${string}`,
          abi: routerAbi,
          functionName: "addLiquidity",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: args as any,
          chainId: pool.chain,
        });
        updateStep(2, { status: "pending-confirmation", txHash: liquidityTx });
        await waitForTx(liquidityTx);
        updateStep(2, { status: "confirmed", txHash: liquidityTx });
        onSuccess?.();
      } catch (err) {
        updateStep(2, {
          status: "failed",
          error: err instanceof Error ? err.message : "Add liquidity failed",
        });
      }
    },
    [address, pool, spender, writeContractAsync, updateStep, onSuccess]
  );

  const deposit = useCallback(
    async (amounts: string[], decimals: number[]) => {
      if (pool.protocol === "aave-v3") {
        const token = pool.tokens[0];
        if (!token) return;
        const amount = parseUnits(amounts[0] ?? "0", decimals[0] ?? 18);
        await depositAave(token.address, amount);
      } else if (
        pool.protocol === "aerodrome" ||
        pool.protocol === "camelot"
      ) {
        const tokenA = pool.tokens[0];
        const tokenB = pool.tokens[1];
        if (!tokenA || !tokenB) return;
        const amountA = parseUnits(amounts[0] ?? "0", decimals[0] ?? 18);
        const amountB = parseUnits(amounts[1] ?? "0", decimals[1] ?? 18);
        const isStable = pool.feeTier === 4;
        await depositDex(tokenA.address, tokenB.address, amountA, amountB, isStable);
      }
    },
    [pool, depositAave, depositDex]
  );

  const isTransacting = steps.some(
    (s) => s.status === "pending-wallet" || s.status === "pending-confirmation"
  );

  return {
    deposit,
    steps,
    isTransacting,
    spender,
  };
}

// ─── Withdraw Hook ──────────────────────────────────────────────

interface UseWithdrawOptions {
  pool: Pool;
  onSuccess?: () => void;
}

export function useWithdraw({ pool, onSuccess }: UseWithdrawOptions) {
  const { address } = useAccount();
  const [steps, setSteps] = useState<TransactionStep[]>([]);

  const { writeContractAsync } = useWriteContract();

  const spender = getSpenderAddress(pool);

  // Gate behind feature flag — return disabled state when vault writes are off
  if (!ENABLE_VAULT_WRITES) {
    return {
      withdraw: async () => {
        /* vault writes disabled */
      },
      steps: [
        {
          action: "withdraw" as const,
          label: "Vault withdrawals are currently disabled (audit in progress)",
          status: "failed" as const,
          error: "Vault withdrawals are temporarily disabled while smart contracts are being audited.",
        },
      ],
      isTransacting: false,
    };
  }

  const updateStep = useCallback(
    (index: number, update: Partial<TransactionStep>) => {
      setSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...update } : s))
      );
    },
    []
  );

  const withdraw = useCallback(
    async (amount: string, decimals: number) => {
      if (!address) return;

      if (pool.protocol === "aave-v3") {
        const token = pool.tokens[0];
        if (!token) return;

        const initialSteps: TransactionStep[] = [
          { action: "withdraw", label: `Withdraw from Aave`, status: "idle" },
        ];
        setSteps(initialSteps);

        updateStep(0, { status: "pending-wallet" });
        try {
          const parsedAmount = parseUnits(amount, decimals);
          const withdrawTx = await writeContractAsync({
            address: spender as `0x${string}`,
            abi: aaveV3PoolAbi,
            functionName: "withdraw",
            args: [token.address as `0x${string}`, parsedAmount, address],
            chainId: pool.chain,
          });
          updateStep(0, { status: "pending-confirmation", txHash: withdrawTx });
          await waitForTx(withdrawTx);
          updateStep(0, { status: "confirmed", txHash: withdrawTx });
          onSuccess?.();
        } catch (err) {
          updateStep(0, {
            status: "failed",
            error: err instanceof Error ? err.message : "Withdrawal failed",
          });
        }
      } else if (
        pool.protocol === "aerodrome" ||
        pool.protocol === "camelot"
      ) {
        const tokenA = pool.tokens[0];
        const tokenB = pool.tokens[1];
        if (!tokenA || !tokenB) return;

        const initialSteps: TransactionStep[] = [
          { action: "approve", label: "Approve LP Token", status: "idle" },
          { action: "withdraw", label: "Remove Liquidity", status: "idle" },
        ];
        setSteps(initialSteps);

        // Step 1: Approve LP token
        updateStep(0, { status: "pending-wallet" });
        try {
          const approveTx = await writeContractAsync({
            address: pool.contractAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "approve",
            args: [spender as `0x${string}`, maxUint256],
            chainId: pool.chain,
          });
          updateStep(0, { status: "pending-confirmation", txHash: approveTx });
          await waitForTx(approveTx);
          updateStep(0, { status: "confirmed", txHash: approveTx });
        } catch (err) {
          updateStep(0, {
            status: "failed",
            error: err instanceof Error ? err.message : "Approval failed",
          });
          return;
        }

        // Step 2: Remove liquidity
        updateStep(1, { status: "pending-wallet" });
        try {
          const lpAmount = parseUnits(amount, 18);
          const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

          const routerAbi =
            pool.protocol === "aerodrome"
              ? aerodromeRouterAbi
              : camelotRouterAbi;

          const isStable = pool.feeTier === 4;

          const args =
            pool.protocol === "aerodrome"
              ? [
                  tokenA.address as `0x${string}`,
                  tokenB.address as `0x${string}`,
                  isStable,
                  lpAmount,
                  0n,
                  0n,
                  address,
                  deadline,
                ]
              : [
                  tokenA.address as `0x${string}`,
                  tokenB.address as `0x${string}`,
                  lpAmount,
                  0n,
                  0n,
                  address,
                  deadline,
                ];

          const removeTx = await writeContractAsync({
            address: spender as `0x${string}`,
            abi: routerAbi,
            functionName: "removeLiquidity",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            args: args as any,
            chainId: pool.chain,
          });
          updateStep(1, { status: "pending-confirmation", txHash: removeTx });
          await waitForTx(removeTx);
          updateStep(1, { status: "confirmed", txHash: removeTx });
          onSuccess?.();
        } catch (err) {
          updateStep(1, {
            status: "failed",
            error: err instanceof Error ? err.message : "Remove liquidity failed",
          });
        }
      }
    },
    [address, pool, spender, writeContractAsync, updateStep, onSuccess]
  );

  const isTransacting = steps.some(
    (s) => s.status === "pending-wallet" || s.status === "pending-confirmation"
  );

  return {
    withdraw,
    steps,
    isTransacting,
  };
}

// ─── Helpers ────────────────────────────────────────────────────

async function waitForTx(hash: `0x${string}`): Promise<void> {
  await waitForTransactionReceipt(config, { hash, confirmations: 1 });
}
