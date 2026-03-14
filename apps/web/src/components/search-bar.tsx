// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { Input } from "@mariposa/ui";
import { useAppStore } from "@/lib/store";

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useAppStore();

  return (
    <Input
      type="search"
      placeholder="Search pools by token, protocol..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="max-w-sm"
    />
  );
}
