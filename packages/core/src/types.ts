/**
 * Core type definitions for Mariposa Finance.
 * All packages share these types for cross-chain DeFi yield aggregation.
 */

// ─── Chain Types ────────────────────────────────────────────────

/** Supported chain IDs */
export type ChainId = 8453 | 42161; // Base, Arbitrum

export interface ChainConfig {
  id: ChainId;
  name: string;
  shortName: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  iconPath: string;
}

// ─── Token Types ────────────────────────────────────────────────

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: ChainId;
  logoUrl?: string;
  priceUsd?: number;
}

// ─── Pool / Vault Types ─────────────────────────────────────────

export type Protocol =
  | "uniswap-v3"
  | "aerodrome"
  | "camelot"
  | "aave-v3"
  | "sushiswap"
  | "radiant";

export type PoolType = "dex" | "lending" | "staking";

export interface PoolApy {
  /** Trading fees APY */
  base: number;
  /** Farming rewards APY */
  reward: number;
  /** Combined total */
  total: number;
}

export interface Pool {
  id: string;
  chain: ChainId;
  protocol: Protocol;
  type: PoolType;
  name: string;
  tokens: Token[];
  apy: PoolApy;
  tvl: number;
  riskScore: number;
  contractAddress: string;
  /** Protocol-specific fee tier (e.g. 500, 3000, 10000 for Uniswap V3) */
  feeTier?: number;
  /** URL to the protocol's pool page */
  url?: string;
  /** Timestamp of last data update */
  updatedAt: number;
}

// ─── User Position Types ────────────────────────────────────────

export interface PositionToken {
  symbol: string;
  amount: number;
  valueUsd: number;
}

export interface Position {
  pool: Pool;
  deposited: number;
  earned: number;
  tokens: PositionToken[];
}

export interface Portfolio {
  address: string;
  positions: Position[];
  totalValue: number;
  totalEarned: number;
}

// ─── Chain Adapter Interface ────────────────────────────────────

export interface ChainAdapter {
  chainId: ChainId;
  chainName: string;

  /** Fetch all available pools on this chain */
  getPoolData(): Promise<Pool[]>;

  /** Fetch a user's positions on this chain */
  getUserPositions(address: string): Promise<Position[]>;

  /** Get the USD price for a token */
  getTokenPrice(tokenAddress: string): Promise<number>;
}

// ─── API Types ──────────────────────────────────────────────────

export interface PoolFilters {
  chain?: ChainId;
  protocol?: Protocol;
  minApy?: number;
  maxApy?: number;
  search?: string;
  sortBy?: "apy" | "tvl" | "name";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface GlobalStats {
  totalPools: number;
  averageApy: number;
  totalTvl: number;
  chainsSupported: number;
  lastUpdated: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
}
