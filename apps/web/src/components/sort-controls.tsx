// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { cn } from "@mariposa/ui";
import { useAppStore } from "@/lib/store";

const sortOptions = [
  { value: "apy" as const, label: "APY" },
  { value: "tvl" as const, label: "TVL" },
  { value: "name" as const, label: "Name" },
];

export function SortControls() {
  const { sortBy, sortOrder, setSortBy, toggleSortOrder } = useAppStore();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Sort:</span>
      {sortOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => {
            if (sortBy === option.value) {
              toggleSortOrder();
            } else {
              setSortBy(option.value);
            }
          }}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            sortBy === option.value
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {option.label}
          {sortBy === option.value && (
            <span className="ml-1">{sortOrder === "desc" ? "\u2193" : "\u2191"}</span>
          )}
        </button>
      ))}
    </div>
  );
}
