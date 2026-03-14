// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { StatsBar } from "@/components/stats-bar";
import { ChainSelector } from "@/components/chain-selector";
import { ProtocolFilter } from "@/components/protocol-filter";
import { SearchBar } from "@/components/search-bar";
import { SortControls } from "@/components/sort-controls";
import { PoolList } from "@/components/pool-list";

export default function JardinesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Jardines</h1>
        <p className="text-muted-foreground mt-1">
          Explore yield farming opportunities across chains
        </p>
      </div>

      <div className="space-y-6">
        <StatsBar />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <ChainSelector />
          <SearchBar />
        </div>

        <ProtocolFilter />

        <div className="flex items-center justify-between">
          <SortControls />
        </div>

        <PoolList />
      </div>
    </div>
  );
}
