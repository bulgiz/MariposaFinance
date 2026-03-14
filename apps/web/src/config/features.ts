// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

/**
 * Feature flags for Mariposa Finance.
 * All flags read from NEXT_PUBLIC_ env vars so they're available client-side.
 */

/** Whether vault deposit/withdraw functionality is enabled */
export const ENABLE_VAULT_WRITES =
  process.env.NEXT_PUBLIC_ENABLE_VAULT_WRITES === "true";

/** Whether the swap feature is enabled */
export const ENABLE_SWAP =
  process.env.NEXT_PUBLIC_ENABLE_SWAP === "true";
