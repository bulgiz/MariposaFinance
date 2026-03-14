import { describe, it, expect } from "vitest";
import {
  generatePoolId,
  formatUsd,
  formatApy,
  truncateAddress,
  filterAndSortPools,
} from "./utils.js";
import type { Pool, PoolFilters } from "./types.js";

describe("generatePoolId", () => {
  it("creates a deterministic ID from chain, protocol, and address", () => {
    const id = generatePoolId(8453, "aerodrome", "0xABCD1234");
    expect(id).toBe("8453-aerodrome-0xabcd1234");
  });

  it("lowercases the contract address", () => {
    const id = generatePoolId(42161, "uniswap-v3", "0xDeAdBeEf");
    expect(id).toBe("42161-uniswap-v3-0xdeadbeef");
  });
});

describe("formatUsd", () => {
  it("formats billions", () => {
    expect(formatUsd(2_500_000_000)).toBe("$2.50B");
  });

  it("formats millions", () => {
    expect(formatUsd(1_200_000)).toBe("$1.20M");
  });

  it("formats thousands", () => {
    expect(formatUsd(45_000)).toBe("$45.00K");
  });

  it("formats small values", () => {
    expect(formatUsd(123.45)).toBe("$123.45");
  });

  it("formats zero", () => {
    expect(formatUsd(0)).toBe("$0.00");
  });
});

describe("formatApy", () => {
  it("formats normal APY", () => {
    expect(formatApy(12.34)).toBe("12.34%");
  });

  it("formats very high APY with K suffix", () => {
    expect(formatApy(1500)).toBe("1.5K%");
  });

  it("formats zero APY", () => {
    expect(formatApy(0)).toBe("0.00%");
  });
});

describe("truncateAddress", () => {
  it("truncates a standard Ethereum address", () => {
    expect(truncateAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x1234...5678"
    );
  });
});

describe("filterAndSortPools", () => {
  const mockPools: Pool[] = [
    {
      id: "1",
      chain: 8453,
      protocol: "aerodrome",
      type: "dex",
      name: "WETH/USDC",
      tokens: [],
      apy: { base: 10, reward: 5, total: 15 },
      tvl: 1_000_000,
      riskScore: 3,
      contractAddress: "0x1",
      updatedAt: Date.now(),
    },
    {
      id: "2",
      chain: 42161,
      protocol: "aave-v3",
      type: "lending",
      name: "USDC Supply",
      tokens: [],
      apy: { base: 5, reward: 0, total: 5 },
      tvl: 5_000_000,
      riskScore: 2,
      contractAddress: "0x2",
      updatedAt: Date.now(),
    },
    {
      id: "3",
      chain: 8453,
      protocol: "uniswap-v3",
      type: "dex",
      name: "WETH/DAI",
      tokens: [],
      apy: { base: 8, reward: 0, total: 8 },
      tvl: 2_000_000,
      riskScore: 4,
      contractAddress: "0x3",
      updatedAt: Date.now(),
    },
  ];

  it("filters by chain", () => {
    const result = filterAndSortPools(mockPools, { chain: 8453 });
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.chain === 8453)).toBe(true);
  });

  it("filters by protocol", () => {
    const result = filterAndSortPools(mockPools, { protocol: "aave-v3" });
    expect(result).toHaveLength(1);
    expect(result[0].protocol).toBe("aave-v3");
  });

  it("filters by minApy", () => {
    const result = filterAndSortPools(mockPools, { minApy: 10 });
    expect(result).toHaveLength(1);
    expect(result[0].apy.total).toBeGreaterThanOrEqual(10);
  });

  it("searches by name", () => {
    const result = filterAndSortPools(mockPools, { search: "DAI" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toContain("DAI");
  });

  it("sorts by APY descending by default", () => {
    const result = filterAndSortPools(mockPools, {});
    expect(result[0].apy.total).toBe(15);
    expect(result[2].apy.total).toBe(5);
  });

  it("sorts by TVL ascending", () => {
    const result = filterAndSortPools(mockPools, {
      sortBy: "tvl",
      sortOrder: "asc",
    });
    expect(result[0].tvl).toBe(1_000_000);
    expect(result[2].tvl).toBe(5_000_000);
  });

  it("applies limit and offset", () => {
    const result = filterAndSortPools(mockPools, { limit: 1, offset: 1 });
    expect(result).toHaveLength(1);
  });

  it("combines multiple filters", () => {
    const filters: PoolFilters = {
      chain: 8453,
      sortBy: "apy",
      sortOrder: "desc",
      limit: 1,
    };
    const result = filterAndSortPools(mockPools, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("WETH/USDC");
  });
});
