import type { ChainAdapter, Pool, GlobalStats, Portfolio, Position } from "@mariposa/core";
import { filterAndSortPools, type PoolFilters, POOL_CACHE_TTL } from "@mariposa/core";
import { BaseAdapter } from "@mariposa/chain-adapters";
import { ArbitrumAdapter } from "@mariposa/chain-adapters";
import { cacheGet, cacheSet } from "./cache.js";

/**
 * PoolService aggregates data from all chain adapters and provides
 * a unified view of pools across all supported chains.
 */
export class PoolService {
  private adapters: ChainAdapter[];
  private cachedPools: Pool[] = [];
  private lastRefresh = 0;
  private refreshIntervalMs: number;
  private refreshPromise: Promise<void> | null = null;

  constructor(refreshIntervalMs = 60_000) {
    this.refreshIntervalMs = refreshIntervalMs;
    this.adapters = [new BaseAdapter(), new ArbitrumAdapter()];
  }

  async getPools(filters?: PoolFilters): Promise<{ pools: Pool[]; total: number }> {
    await this.ensureFresh();
    const filtered = filters
      ? filterAndSortPools(this.cachedPools, filters)
      : this.cachedPools;
    return {
      pools: filtered,
      total: filters
        ? filterAndSortPools(this.cachedPools, { ...filters, limit: undefined, offset: undefined }).length
        : this.cachedPools.length,
    };
  }

  async getPoolById(id: string): Promise<Pool | undefined> {
    await this.ensureFresh();
    return this.cachedPools.find((p) => p.id === id);
  }

  async getStats(): Promise<GlobalStats> {
    await this.ensureFresh();
    const pools = this.cachedPools;
    const totalApy = pools.reduce((sum, p) => sum + p.apy.total, 0);
    return {
      totalPools: pools.length,
      averageApy: pools.length > 0 ? totalApy / pools.length : 0,
      totalTvl: pools.reduce((sum, p) => sum + p.tvl, 0),
      chainsSupported: new Set(pools.map((p) => p.chain)).size,
      lastUpdated: this.lastRefresh,
    };
  }

  async getPortfolio(address: string): Promise<Portfolio> {
    console.log(`[PoolService] Fetching portfolio for ${address}...`);
    const results = await Promise.allSettled(
      this.adapters.map((adapter) => adapter.getUserPositions(address))
    );

    const positions: Position[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        positions.push(...result.value);
      } else {
        console.error("[PoolService] Position fetch failed:", result.reason);
      }
    }

    const totalValue = positions.reduce((sum, p) => sum + p.deposited, 0);
    const totalEarned = positions.reduce((sum, p) => sum + p.earned, 0);

    console.log(`[PoolService] Found ${positions.length} positions for ${address}`);
    return { address, positions, totalValue, totalEarned };
  }

  /**
   * Ensure pool data is fresh. If stale, refresh from all adapters.
   * Deduplicates concurrent refresh calls.
   */
  private async ensureFresh(): Promise<void> {
    const now = Date.now();
    if (now - this.lastRefresh < this.refreshIntervalMs && this.cachedPools.length > 0) {
      return;
    }

    if (this.refreshPromise) {
      await this.refreshPromise;
      return;
    }

    this.refreshPromise = this.refresh();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async refresh(): Promise<void> {
    // Try Redis cache first (for fast restart / multi-instance)
    const cached = await cacheGet<Pool[]>("pools:all");
    if (cached && cached.length > 0) {
      this.cachedPools = cached;
      this.lastRefresh = Date.now();
      console.log(`[PoolService] Restored ${cached.length} pools from Redis cache`);
      return;
    }

    console.log("[PoolService] Refreshing pool data from all chains...");
    const results = await Promise.allSettled(
      this.adapters.map((adapter) => adapter.getPoolData())
    );

    const pools: Pool[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        pools.push(...result.value);
      } else {
        console.error("[PoolService] Adapter fetch failed:", result.reason);
      }
    }

    this.cachedPools = pools;
    this.lastRefresh = Date.now();

    // Persist to Redis for other instances / fast restarts
    await cacheSet("pools:all", pools, POOL_CACHE_TTL);

    console.log(`[PoolService] Cached ${pools.length} pools from ${this.adapters.length} chains`);
  }
}
