// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  SWAP_TOKEN_CACHE_TTL,
  SWAP_PRICE_CACHE_TTL,
  SUPPORTED_SWAP_CHAINS,
} from "@mariposa/core";
import { cacheGet, cacheSet } from "../cache.js";

const ONEINCH_BASE_URL = "https://api.1inch.dev/swap/v6.0";
const ONEINCH_API_KEY = process.env["ONEINCH_API_KEY"] ?? "";
const MARIPOSA_FEE_WALLET = process.env["MARIPOSA_FEE_WALLET"] ?? "";
const MARIPOSA_FEE_PERCENT = Number(
  process.env["MARIPOSA_FEE_PERCENT"] ?? "0.15"
);

// ─── Validation Schemas ──────────────────────────────────────────

const chainIdSchema = z.coerce
  .number()
  .refine(
    (v): v is (typeof SUPPORTED_SWAP_CHAINS)[number] =>
      (SUPPORTED_SWAP_CHAINS as readonly number[]).includes(v),
    {
      message:
        "Unsupported chain. Supported: 1 (Ethereum), 10 (Optimism), 56 (BNB), 137 (Polygon), 250 (Fantom), 324 (zkSync), 8453 (Base), 42161 (Arbitrum), 43114 (Avalanche)",
    }
  );

const quoteQuerySchema = z.object({
  src: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid source token address"),
  dst: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid destination token address"),
  amount: z.string().regex(/^\d+$/, "Amount must be a numeric string (wei)"),
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid from address"),
  slippage: z.coerce.number().min(0).max(50).default(1),
  chainId: chainIdSchema,
});

const tokensQuerySchema = z.object({
  chainId: chainIdSchema,
});

const priceQuerySchema = z.object({
  chainId: chainIdSchema,
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid token address"),
});

// ─── Rate Limit Tracker (in-memory, per IP) ─────────────────────

const quoteRateMap = new Map<string, { count: number; resetAt: number }>();

function checkQuoteRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = quoteRateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    quoteRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

// ─── 1inch API Helper ────────────────────────────────────────────

async function fetchOneInch(
  chainId: number,
  endpoint: string,
  params?: Record<string, string>
): Promise<Response> {
  const url = new URL(`${ONEINCH_BASE_URL}/${chainId}${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${ONEINCH_API_KEY}`,
      Accept: "application/json",
    },
  });
}

// ─── Fallback Token Lists (when 1inch API key is not configured) ─

type FallbackToken = { address: string; symbol: string; name: string; decimals: number; logoURI: string };
const NATIVE_ETH: FallbackToken = { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "ETH", name: "Ethereum", decimals: 18, logoURI: "https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png" };

const FALLBACK_TOKENS: Record<number, Record<string, FallbackToken>> = {
  // Ethereum Mainnet
  1: {
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": NATIVE_ETH,
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: "https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png" },
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png" },
    "0xdAC17F958D2ee523a2206206994597C13D831ec7": { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6, logoURI: "https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png" },
    "0x6B175474E89094C44Da98b954EedeAC495271d0F": { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, logoURI: "https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png" },
  },
  // Optimism
  10: {
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": NATIVE_ETH,
    "0x4200000000000000000000000000000000000006": { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: "https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png" },
    "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85": { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png" },
    "0x4200000000000000000000000000000000000042": { address: "0x4200000000000000000000000000000000000042", symbol: "OP", name: "Optimism", decimals: 18, logoURI: "" },
  },
  // BNB Smart Chain
  56: {
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "BNB", name: "BNB", decimals: 18, logoURI: "https://tokens.1inch.io/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c.png" },
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c": { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", symbol: "WBNB", name: "Wrapped BNB", decimals: 18, logoURI: "https://tokens.1inch.io/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c.png" },
    "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d": { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18, logoURI: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png" },
    "0x55d398326f99059fF775485246999027B3197955": { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether USD", decimals: 18, logoURI: "https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png" },
  },
  // Polygon
  137: {
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "MATIC", name: "Polygon", decimals: 18, logoURI: "https://tokens.1inch.io/0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0.png" },
    "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270": { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", symbol: "WMATIC", name: "Wrapped Matic", decimals: 18, logoURI: "https://tokens.1inch.io/0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0.png" },
    "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359": { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png" },
  },
  // Fantom
  250: {
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "FTM", name: "Fantom", decimals: 18, logoURI: "" },
    "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83": { address: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83", symbol: "WFTM", name: "Wrapped Fantom", decimals: 18, logoURI: "" },
    "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75": { address: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png" },
  },
  // zkSync Era
  324: {
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": NATIVE_ETH,
    "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91": { address: "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: "https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png" },
    "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4": { address: "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png" },
  },
  // Base
  8453: {
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": NATIVE_ETH,
    "0x4200000000000000000000000000000000000006": { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: "https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png" },
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png" },
    "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6Ca": { address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6Ca", symbol: "USDbC", name: "USD Base Coin", decimals: 6, logoURI: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png" },
    "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb": { address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, logoURI: "https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png" },
    "0x940181a94A35A4569E4529A3CDfB74e38FD98631": { address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", symbol: "AERO", name: "Aerodrome", decimals: 18, logoURI: "" },
  },
  // Arbitrum
  42161: {
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": NATIVE_ETH,
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1": { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: "https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png" },
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831": { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png" },
    "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8": { address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", symbol: "USDC.e", name: "Bridged USDC", decimals: 6, logoURI: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png" },
    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1": { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, logoURI: "https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png" },
    "0x912CE59144191C1204E64559FE8253a0e49E6548": { address: "0x912CE59144191C1204E64559FE8253a0e49E6548", symbol: "ARB", name: "Arbitrum", decimals: 18, logoURI: "" },
  },
  // Avalanche
  43114: {
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "AVAX", name: "Avalanche", decimals: 18, logoURI: "" },
    "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7": { address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", symbol: "WAVAX", name: "Wrapped AVAX", decimals: 18, logoURI: "" },
    "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E": { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png" },
  },
};

// ─── Route Registration ──────────────────────────────────────────

export function registerSwapRoutes(app: FastifyInstance) {
  /**
   * GET /swap/quote
   * Proxy to 1inch swap endpoint with referrer fee.
   */
  app.get("/swap/quote", async (request, reply) => {
    try {
      const query = quoteQuerySchema.parse(request.query);

      // Require API key for quotes
      if (!ONEINCH_API_KEY) {
        return reply.status(503).send({
          error: "Swap quotes are not available yet. 1inch API key not configured.",
        });
      }

      // Rate limit: 10 quotes per minute per IP
      const clientIp = request.ip;
      if (!checkQuoteRateLimit(clientIp)) {
        return reply.status(429).send({
          error: "Rate limit exceeded. Maximum 10 quote requests per minute.",
        });
      }

      const params: Record<string, string> = {
        src: query.src,
        dst: query.dst,
        amount: query.amount,
        from: query.from,
        slippage: String(query.slippage),
        disableEstimate: "true",
      };

      // Add referrer fee if wallet is configured
      if (MARIPOSA_FEE_WALLET) {
        params.referrer = MARIPOSA_FEE_WALLET;
        params.fee = String(MARIPOSA_FEE_PERCENT);
      }

      const response = await fetchOneInch(query.chainId, "/swap", params);

      if (!response.ok) {
        const errorBody = await response.text();
        app.log.error(
          { status: response.status, body: errorBody },
          "1inch quote API error"
        );
        return reply.status(response.status).send({
          error: "Failed to fetch swap quote",
          details: response.status === 400 ? errorBody : undefined,
        });
      }

      const data = await response.json();

      // Log swap request for analytics
      app.log.info(
        {
          event: "swap_quote",
          chainId: query.chainId,
          src: query.src,
          dst: query.dst,
          amount: query.amount,
          from: query.from,
        },
        "Swap quote requested"
      );

      return reply.send({ data });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Invalid query parameters",
          details: err.errors,
        });
      }
      throw err;
    }
  });

  /**
   * GET /swap/tokens
   * List supported tokens per chain (cached 1hr in Redis).
   */
  app.get("/swap/tokens", async (request, reply) => {
    try {
      const query = tokensQuerySchema.parse(request.query);
      const cacheKey = `swap:tokens:${query.chainId}`;

      // Check cache first
      const cached = await cacheGet<unknown>(cacheKey);
      if (cached) {
        return reply.send({ data: cached });
      }

      // If no API key, return fallback tokens
      if (!ONEINCH_API_KEY) {
        const fallback = { tokens: FALLBACK_TOKENS[query.chainId] ?? {} };
        return reply.send({ data: fallback });
      }

      const response = await fetchOneInch(query.chainId, "/tokens");

      if (!response.ok) {
        app.log.error(
          { status: response.status },
          "1inch tokens API error"
        );
        // Fall back to hardcoded tokens on API failure
        const fallback = { tokens: FALLBACK_TOKENS[query.chainId] ?? {} };
        return reply.send({ data: fallback });
      }

      const data = await response.json();

      // Cache for 1 hour
      await cacheSet(cacheKey, data, SWAP_TOKEN_CACHE_TTL);

      return reply.send({ data });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Invalid query parameters",
          details: err.errors,
        });
      }
      throw err;
    }
  });

  /**
   * GET /swap/price
   * Token price lookup (cached 30s).
   */
  app.get("/swap/price", async (request, reply) => {
    try {
      const query = priceQuerySchema.parse(request.query);
      const cacheKey = `swap:price:${query.chainId}:${query.tokenAddress}`;

      // Check cache first
      const cached = await cacheGet<unknown>(cacheKey);
      if (cached) {
        return reply.send({ data: cached });
      }

      // Use 1inch price API (different base URL)
      const url = new URL(
        `https://api.1inch.dev/price/v1.1/${query.chainId}/${query.tokenAddress}`
      );

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${ONEINCH_API_KEY}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        app.log.error(
          { status: response.status },
          "1inch price API error"
        );
        return reply.status(502).send({ error: "Failed to fetch token price" });
      }

      const data = await response.json();

      // Cache for 30s
      await cacheSet(cacheKey, data, SWAP_PRICE_CACHE_TTL);

      return reply.send({ data });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Invalid query parameters",
          details: err.errors,
        });
      }
      throw err;
    }
  });
}
