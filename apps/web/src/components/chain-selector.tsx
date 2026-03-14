// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { cn } from "@mariposa/ui";
import { SUPPORTED_CHAIN_IDS, getChainConfig, type ChainId } from "@mariposa/core";
import { useAppStore } from "@/lib/store";

export function ChainSelector() {
  const { selectedChain, setSelectedChain } = useAppStore();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setSelectedChain(null)}
        className={cn(
          "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
          selectedChain === null
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        )}
      >
        All Chains
      </button>
      {SUPPORTED_CHAIN_IDS.map((chainId) => {
        const chain = getChainConfig(chainId);
        return (
          <button
            key={chainId}
            onClick={() =>
              setSelectedChain(
                selectedChain === chainId ? null : (chainId as ChainId)
              )
            }
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              selectedChain === chainId
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {chain.name}
          </button>
        );
      })}
    </div>
  );
}
