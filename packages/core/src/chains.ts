// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

import type { ChainConfig, ChainId } from "./types.js";

export const CHAIN_CONFIGS: Record<ChainId, ChainConfig> = {
  8453: {
    id: 8453,
    name: "Base",
    shortName: "base",
    rpcUrl: process.env["BASE_RPC_URL"] ?? "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    iconPath: "/chains/base.svg",
  },
  42161: {
    id: 42161,
    name: "Arbitrum",
    shortName: "arbitrum",
    rpcUrl:
      process.env["ARBITRUM_RPC_URL"] ?? "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    iconPath: "/chains/arbitrum.svg",
  },
};

export const SUPPORTED_CHAIN_IDS: ChainId[] = [8453, 42161];

export function getChainConfig(chainId: ChainId): ChainConfig {
  return CHAIN_CONFIGS[chainId];
}

export function getChainName(chainId: ChainId): string {
  return CHAIN_CONFIGS[chainId].name;
}
