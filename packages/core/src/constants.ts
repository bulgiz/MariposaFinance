// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

/** Performance fee taken on vault harvests (4.5%) */
export const PERFORMANCE_FEE_BPS = 450;

/** Swap fee on ZAP aggregator routes (0.15%) */
export const SWAP_FEE_BPS = 15;

/** Seconds in a year for APY calculations */
export const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60;

/** Seconds in a day */
export const SECONDS_PER_DAY = 24 * 60 * 60;

/** Pool data cache TTL in seconds */
export const POOL_CACHE_TTL = 60;

/** API rate limit: requests per minute */
export const API_RATE_LIMIT = 100;

/** Swap token list cache TTL in seconds (1 hour) */
export const SWAP_TOKEN_CACHE_TTL = 3600;

/** Swap price cache TTL in seconds (30s) */
export const SWAP_PRICE_CACHE_TTL = 30;

/** EVM chains that support swap aggregation */
export const SUPPORTED_SWAP_CHAINS = [
  1, 10, 56, 137, 250, 324, 8453, 42161, 43114,
] as const;

/** EVM chain display names */
export const EVM_CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  56: "BNB Chain",
  137: "Polygon",
  250: "Fantom",
  324: "zkSync Era",
  8453: "Base",
  42161: "Arbitrum",
  43114: "Avalanche",
} as const;

/** Non-EVM chains with their swap aggregators */
export const NON_EVM_CHAINS = {
  solana: { name: "Solana", aggregator: "jupiter" },
  algorand: { name: "Algorand", aggregator: "tinyman" },
  sui: { name: "Sui", aggregator: "cetus" },
  aptos: { name: "Aptos", aggregator: "liquidswap" },
} as const;

/** Aggregators available per EVM chain */
export const EVM_AGGREGATORS: Record<number, readonly string[]> = {
  1: ["oneinch", "zerox", "paraswap", "openocean"],
  10: ["oneinch", "zerox", "paraswap", "openocean"],
  56: ["oneinch", "zerox", "paraswap", "openocean"],
  137: ["oneinch", "zerox", "paraswap", "openocean"],
  250: ["oneinch", "zerox", "paraswap", "openocean"],
  324: ["oneinch", "openocean"],
  8453: ["oneinch", "zerox", "paraswap", "openocean"],
  42161: ["oneinch", "zerox", "paraswap", "openocean"],
  43114: ["oneinch", "zerox", "paraswap", "openocean"],
} as const;

/** Brand colors */
export const COLORS = {
  primary: "#7B2D8E",
  accent: "#D4A017",
  dark: "#2C1338",
  background: "#0F0A12",
  surface: "#1A1225",
  surfaceLight: "#2A1E35",
  text: "#F5F0F7",
  textMuted: "#A89BB0",
} as const;

/** Known token addresses per chain */
export const TOKENS = {
  8453: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6Ca",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    AERO: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
  },
  42161: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    "USDC.e": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    GRAIL: "0x3d9907F9a368ad0a51Be60f7Da3b97cf940982D8",
  },
} as const;

/** Protocol contract addresses */
export const PROTOCOLS = {
  8453: {
    aerodrome: {
      router: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
      voter: "0x16613524e02ad97eDfeF371bC883F2F5d6C480A5",
      factory: "0x420DD381b31aEf6683db6B902084cB0FFECe40Da",
    },
    uniswapV3: {
      factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
      quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    },
    aaveV3: {
      pool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
      poolDataProvider: "0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac",
    },
  },
  42161: {
    camelot: {
      router: "0xc873fEcbd354f5A56E00E710B90EF4201db2448d",
      factory: "0x6EcCab422D763aC031210895C81787E87B43A652",
    },
    uniswapV3: {
      factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      quoter: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
    },
    aaveV3: {
      pool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
      poolDataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
    },
  },
} as const;
