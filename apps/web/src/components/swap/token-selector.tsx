// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { useState, useMemo } from "react";
import { Input } from "@mariposa/ui";
import type { TokenInfo } from "@mariposa/core";

interface TokenSelectorProps {
  tokens: TokenInfo[];
  selectedToken: TokenInfo | null;
  onSelect: (token: TokenInfo) => void;
  label: string;
}

export function TokenSelector({
  tokens,
  selectedToken,
  onSelect,
  label,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return tokens;
    const q = search.toLowerCase();
    return tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q)
    );
  }, [tokens, search]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors min-w-[140px]"
      >
        {selectedToken ? (
          <>
            {selectedToken.logoURI && (
              <img
                src={selectedToken.logoURI}
                alt={selectedToken.symbol}
                className="h-5 w-5 rounded-full"
              />
            )}
            <span>{selectedToken.symbol}</span>
          </>
        ) : (
          <span className="text-muted-foreground">{label}</span>
        )}
        <svg
          className="ml-auto h-4 w-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card shadow-xl">
          <div className="p-3 border-b border-border">
            <Input
              placeholder="Search by name or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-sm"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No tokens found
              </div>
            ) : (
              filtered.map((token) => (
                <button
                  key={token.address}
                  onClick={() => {
                    onSelect(token);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-secondary transition-colors ${
                    selectedToken?.address === token.address
                      ? "bg-primary/10 text-primary"
                      : ""
                  }`}
                >
                  {token.logoURI && (
                    <img
                      src={token.logoURI}
                      alt={token.symbol}
                      className="h-6 w-6 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{token.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {token.name}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
