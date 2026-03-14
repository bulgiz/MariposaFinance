// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { Config } from "wagmi";
import { base, arbitrum } from "wagmi/chains";

export const config: Config = getDefaultConfig({
  appName: "Mariposa Finance",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo",
  chains: [base, arbitrum],
  ssr: true,
});
