"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPools, fetchPool, fetchStats } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export function usePools() {
  const { selectedChain, searchQuery, selectedProtocol, sortBy, sortOrder } =
    useAppStore();

  return useQuery({
    queryKey: [
      "pools",
      selectedChain,
      searchQuery,
      selectedProtocol,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      fetchPools({
        chain: selectedChain ?? undefined,
        protocol: selectedProtocol ?? undefined,
        search: searchQuery || undefined,
        sortBy,
        sortOrder,
        limit: 50,
      }),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function usePool(id: string) {
  return useQuery({
    queryKey: ["pool", id],
    queryFn: () => fetchPool(id),
    staleTime: 60_000,
  });
}

export function useGlobalStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchStats(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
