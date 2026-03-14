// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

/**
 * Core type definitions for Mariposa Finance.
 * All packages share these types for cross-chain DeFi yield aggregation.
 */

// ─── Chain Types ────────────────────────────────────────────────

/** Supported EVM chain IDs */
export type EvmChainId =
  | 1      // Ethereum
  | 10     // Optimism
  | 56     // BNB Smart Chain
  | 137    // Polygon
  | 250    // Fantom
  | 324    // zkSync Era
  | 8453   // Base
  | 42161  // Arbitrum
  | 43114; // Avalanche

/** Non-EVM chain identifiers (for future multi-ecosystem support) */
export type NonEvmChain = "solana" | "algorand" | "sui" | "aptos";

/** All chain identifiers — EVM (numeric) + non-EVM (string) */
export type AnyChainId = EvmChainId | NonEvmChain;

/**
 * ChainId for pool/vault features — chains with active adapters.
 * Use EvmChainId for swap features (all 9 EVM chains).
 * Use AnyChainId for future cross-ecosystem features.
 */
export type ChainId = 8453 | 42161;

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

// ─── Vault Transaction Types ────────────────────────────────────

export type VaultAction = "deposit" | "withdraw" | "approve";

export type TransactionStatus =
  | "idle"
  | "pending-wallet"
  | "pending-confirmation"
  | "confirmed"
  | "failed";

export interface TransactionStep {
  action: VaultAction;
  label: string;
  status: TransactionStatus;
  txHash?: string;
  error?: string;
}

export interface DepositParams {
  poolId: string;
  chainId: ChainId;
  protocol: Protocol;
  contractAddress: string;
  tokens: Array<{
    address: string;
    symbol: string;
    decimals: number;
    amount: bigint;
  }>;
  spender: string;
}

export interface WithdrawParams {
  poolId: string;
  chainId: ChainId;
  protocol: Protocol;
  contractAddress: string;
  token: {
    address: string;
    symbol: string;
    decimals: number;
    amount: bigint;
  };
}

export interface TransactionRecord {
  id: string;
  action: VaultAction;
  poolName: string;
  chainId: ChainId;
  protocol: Protocol;
  amountUsd: number;
  txHash: string;
  status: "confirmed" | "failed";
  timestamp: number;
}

// ─── Swap Types ─────────────────────────────────────────────────

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface SwapQuoteParams {
  src: string;
  dst: string;
  amount: string;
  from: string;
  slippage: number;
  chainId: ChainId;
  referrer?: string;
  fee?: number;
}

export interface SwapQuoteResponse {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: string;
  toAmount: string;
  /** Transaction data ready to send */
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gas: number;
    gasPrice: string;
  };
  /** Estimated gas in native units */
  estimatedGas: number;
  /** Price impact as a percentage (e.g. 0.5 = 0.5%) */
  priceImpact?: number;
  /** Exchange rate: how many dst tokens per 1 src token */
  exchangeRate: string;
}

export interface SwapTransaction {
  id: string;
  chainId: ChainId;
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: string;
  toAmount: string;
  txHash: string;
  status: "pending" | "confirmed" | "failed";
  timestamp: number;
}

// ─── Smart Routing Types ────────────────────────────────────────

/** Supported swap aggregator identifiers */
export type AggregatorId =
  | "oneinch"
  | "zerox"
  | "paraswap"
  | "openocean"
  | "jupiter"
  | "tinyman"
  | "cetus"
  | "liquidswap";

/** A quote returned by a single aggregator */
export interface AggregatorQuote {
  aggregator: AggregatorId;
  toAmount: string;
  estimatedGas: number;
  priceImpact: number;
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gas: number;
    gasPrice: string;
  };
}

/** Smart router result comparing multiple aggregators */
export interface SmartRouterResult {
  /** The best quote (highest output after fees + gas) */
  bestQuote: AggregatorQuote;
  /** All quotes for transparency */
  allQuotes: AggregatorQuote[];
  /** How much better vs worst quote (e.g. "Saving $2.34 vs 1inch") */
  savings: string;
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
