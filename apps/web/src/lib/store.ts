"use client";

import { create } from "zustand";
import type { ChainId, Protocol, TransactionRecord } from "@mariposa/core";

interface AppState {
  selectedChain: ChainId | null;
  searchQuery: string;
  selectedProtocol: Protocol | null;
  sortBy: "apy" | "tvl" | "name";
  sortOrder: "asc" | "desc";

  // Transaction history
  transactions: TransactionRecord[];

  setSelectedChain: (chain: ChainId | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedProtocol: (protocol: Protocol | null) => void;
  setSortBy: (sortBy: "apy" | "tvl" | "name") => void;
  toggleSortOrder: () => void;
  addTransaction: (tx: TransactionRecord) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedChain: null,
  searchQuery: "",
  selectedProtocol: null,
  sortBy: "apy",
  sortOrder: "desc",
  transactions: [],

  setSelectedChain: (chain) => set({ selectedChain: chain }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedProtocol: (protocol) => set({ selectedProtocol: protocol }),
  setSortBy: (sortBy) => set({ sortBy }),
  toggleSortOrder: () =>
    set((state) => ({ sortOrder: state.sortOrder === "desc" ? "asc" : "desc" })),
  addTransaction: (tx) =>
    set((state) => ({ transactions: [tx, ...state.transactions].slice(0, 50) })),
}));
