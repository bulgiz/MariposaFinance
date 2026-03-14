// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

import type { ChainId, Pool, PoolFilters } from "./types.js";

/**
 * Generate a unique pool ID from chain, protocol, and contract address.
 */
export function generatePoolId(
  chain: ChainId,
  protocol: string,
  contractAddress: string
): string {
  return `${chain}-${protocol}-${contractAddress.toLowerCase()}`;
}

/**
 * Format a number as compact USD (e.g., $1.2M, $450K).
 */
export function formatUsd(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

/**
 * Format APY as a percentage string.
 */
export function formatApy(apy: number | null | undefined): string {
  if (apy == null) return "—";
  if (apy >= 1000) {
    return `${(apy / 1000).toFixed(1)}K%`;
  }
  return `${apy.toFixed(2)}%`;
}

/**
 * Truncate an Ethereum address for display.
 */
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Apply filters and sorting to a pool list.
 */
export function filterAndSortPools(
  pools: Pool[],
  filters: PoolFilters
): Pool[] {
  let result = [...pools];

  if (filters.chain) {
    result = result.filter((p) => p.chain === filters.chain);
  }

  if (filters.protocol) {
    result = result.filter((p) => p.protocol === filters.protocol);
  }

  if (filters.minApy !== undefined) {
    result = result.filter((p) => p.apy.total >= (filters.minApy ?? 0));
  }

  if (filters.maxApy !== undefined) {
    result = result.filter((p) => p.apy.total <= (filters.maxApy ?? Infinity));
  }

  if (filters.search) {
    const query = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.protocol.toLowerCase().includes(query) ||
        p.tokens.some((t) => t.symbol.toLowerCase().includes(query))
    );
  }

  const sortBy = filters.sortBy ?? "apy";
  const sortOrder = filters.sortOrder ?? "desc";
  const multiplier = sortOrder === "desc" ? -1 : 1;

  result.sort((a, b) => {
    switch (sortBy) {
      case "apy":
        return (a.apy.total - b.apy.total) * multiplier;
      case "tvl":
        return (a.tvl - b.tvl) * multiplier;
      case "name":
        return a.name.localeCompare(b.name) * multiplier;
      default:
        return 0;
    }
  });

  if (filters.offset) {
    result = result.slice(filters.offset);
  }
  if (filters.limit) {
    result = result.slice(0, filters.limit);
  }

  return result;
}
