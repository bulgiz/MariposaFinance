// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import type { Config } from "wagmi";
import {
  base, arbitrum, mainnet, optimism, polygon, bsc, avalanche,
} from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

// Only include WalletConnect wallets if a real project ID is configured.
const connectors = connectorsForWallets(
  [{
    groupName: "Wallets",
    wallets: projectId
      ? [injectedWallet, metaMaskWallet, coinbaseWallet, walletConnectWallet, rainbowWallet]
      : [injectedWallet, metaMaskWallet, coinbaseWallet],
  }],
  { appName: "Mariposa Finance", projectId: projectId || "placeholder" }
);

export const config: Config = createConfig({
  connectors,
  chains: [base, arbitrum, mainnet, optimism, polygon, bsc, avalanche],
  transports: {
    [base.id]:      http("https://base.llamarpc.com"),
    [arbitrum.id]:  http("https://arb1.arbitrum.io/rpc"),
    [mainnet.id]:   http("https://eth.llamarpc.com"),
    [optimism.id]:  http("https://optimism.llamarpc.com"),
    [polygon.id]:   http("https://polygon.llamarpc.com"),
    [bsc.id]:       http("https://binance.llamarpc.com"),
    [avalanche.id]: http("https://avalanche.public-rpc.com"),

  },
  ssr: true,
});
