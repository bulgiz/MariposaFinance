// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

/**
 * CoinGecko price feed service.
 *
 * Fetches live USD prices for tokens used across all chain adapters.
 * Uses the free /simple/price endpoint (rate limit ~30 req/min).
 * Maintains an in-memory cache with configurable TTL.
 */

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

/** Map of token symbol → CoinGecko ID */
const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum",
  WETH: "weth",
  USDC: "usd-coin",
  "USDC.e": "usd-coin",
  USDbC: "usd-coin",
  DAI: "dai",
  AERO: "aerodrome-finance",
  ARB: "arbitrum",
  GRAIL: "camelot-token",
};

/** Hardcoded fallback prices in case CoinGecko is unreachable */
const FALLBACK_PRICES: Record<string, number> = {
  ETH: 3000,
  WETH: 3000,
  USDC: 1,
  "USDC.e": 1,
  USDbC: 1,
  DAI: 1,
  AERO: 1.5,
  ARB: 1.2,
  GRAIL: 200,
};

interface PriceCache {
  prices: Record<string, number>;
  fetchedAt: number;
}

export class PriceService {
  private cache: PriceCache | null = null;
  private cacheTtlMs: number;
  private fetchPromise: Promise<void> | null = null;

  constructor(cacheTtlMs = 120_000) {
    this.cacheTtlMs = cacheTtlMs;
  }

  /**
   * Get the USD price for a token symbol.
   * Returns the live price if available, otherwise falls back to a hardcoded estimate.
   */
  async getPrice(symbol: string): Promise<number> {
    await this.ensureFresh();
    return this.cache?.prices[symbol] ?? FALLBACK_PRICES[symbol] ?? 0;
  }

  /**
   * Get prices for multiple symbols at once.
   */
  async getPrices(symbols: string[]): Promise<Record<string, number>> {
    await this.ensureFresh();
    const result: Record<string, number> = {};
    for (const symbol of symbols) {
      result[symbol] =
        this.cache?.prices[symbol] ?? FALLBACK_PRICES[symbol] ?? 0;
    }
    return result;
  }

  private async ensureFresh(): Promise<void> {
    const now = Date.now();
    if (this.cache && now - this.cache.fetchedAt < this.cacheTtlMs) {
      return;
    }

    // Deduplicate concurrent refresh calls
    if (this.fetchPromise) {
      await this.fetchPromise;
      return;
    }

    this.fetchPromise = this.refresh();
    try {
      await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }
  }

  private async refresh(): Promise<void> {
    const uniqueIds = [...new Set(Object.values(COINGECKO_IDS))];
    const idsParam = uniqueIds.join(",");

    try {
      const url = `${COINGECKO_BASE}/simple/price?ids=${idsParam}&vs_currencies=usd`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        console.warn(
          `[PriceService] CoinGecko returned ${res.status}, using cached/fallback prices`
        );
        if (!this.cache) {
          this.cache = { prices: { ...FALLBACK_PRICES }, fetchedAt: Date.now() };
        }
        return;
      }

      const data = (await res.json()) as Record<
        string,
        { usd?: number }
      >;

      const prices: Record<string, number> = {};
      for (const [symbol, cgId] of Object.entries(COINGECKO_IDS)) {
        const price = data[cgId]?.usd;
        if (price !== undefined) {
          prices[symbol] = price;
        } else {
          prices[symbol] = FALLBACK_PRICES[symbol] ?? 0;
        }
      }

      this.cache = { prices, fetchedAt: Date.now() };
      console.log(
        `[PriceService] Refreshed ${Object.keys(prices).length} token prices from CoinGecko`
      );
    } catch (err) {
      console.error("[PriceService] Failed to fetch prices from CoinGecko:", err);
      // Use fallback prices on first failure
      if (!this.cache) {
        this.cache = { prices: { ...FALLBACK_PRICES }, fetchedAt: Date.now() };
      }
    }
  }
}

/** Singleton price service shared across all adapters */
export const priceService = new PriceService();
