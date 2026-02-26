"use client";

import { useGlobalStats } from "@/hooks/use-pools";
import { formatUsd, formatApy } from "@mariposa/core";
import { Skeleton } from "@mariposa/ui";

export function StatsBar() {
  const { data, isLoading } = useGlobalStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const stats = data?.data;
  if (!stats) return null;

  const items = [
    { label: "Total Pools", value: String(stats.totalPools) },
    { label: "Average APY", value: formatApy(stats.averageApy) },
    { label: "Total TVL", value: formatUsd(stats.totalTvl) },
    { label: "Chains", value: String(stats.chainsSupported) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border bg-card p-4 text-center"
        >
          <div className="text-2xl font-bold text-accent">{item.value}</div>
          <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
