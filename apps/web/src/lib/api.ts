// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

import type { Pool, GlobalStats, Portfolio, ApiResponse, PoolFilters, SwapQuoteResponse } from "@mariposa/core";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchPools(filters?: PoolFilters): Promise<ApiResponse<Pool[]>> {
  const params = new URLSearchParams();
  if (filters?.chain) params.set("chain", String(filters.chain));
  if (filters?.protocol) params.set("protocol", filters.protocol);
  if (filters?.minApy) params.set("minApy", String(filters.minApy));
  if (filters?.search) params.set("search", filters.search);
  if (filters?.sortBy) params.set("sortBy", filters.sortBy);
  if (filters?.sortOrder) params.set("sortOrder", filters.sortOrder);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.offset) params.set("offset", String(filters.offset));

  const qs = params.toString();
  return fetchApi<ApiResponse<Pool[]>>(`/pools${qs ? `?${qs}` : ""}`);
}

export async function fetchPool(id: string): Promise<{ data: Pool }> {
  return fetchApi<{ data: Pool }>(`/pools/${encodeURIComponent(id)}`);
}

export async function fetchStats(): Promise<{ data: GlobalStats }> {
  return fetchApi<{ data: GlobalStats }>("/stats");
}

export async function fetchPortfolio(address: string): Promise<{ data: Portfolio }> {
  return fetchApi<{ data: Portfolio }>(`/portfolio/${address}`);
}

// ─── Swap API Functions ──────────────────────────────────────────

export async function fetchSwapQuote(params: {
  src: string;
  dst: string;
  amount: string;
  from: string;
  slippage: number;
  chainId: number;
}): Promise<{ data: SwapQuoteResponse }> {
  const qs = new URLSearchParams({
    src: params.src,
    dst: params.dst,
    amount: params.amount,
    from: params.from,
    slippage: String(params.slippage),
    chainId: String(params.chainId),
  }).toString();
  return fetchApi<{ data: SwapQuoteResponse }>(`/swap/quote?${qs}`);
}

export async function fetchSwapTokens(chainId: number): Promise<{ data: unknown }> {
  return fetchApi<{ data: unknown }>(`/swap/tokens?chainId=${chainId}`);
}

export async function fetchSwapPrice(
  chainId: number,
  tokenAddress: string
): Promise<{ data: unknown }> {
  return fetchApi<{ data: unknown }>(
    `/swap/price?chainId=${chainId}&tokenAddress=${tokenAddress}`
  );
}
