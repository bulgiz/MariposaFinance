// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { TokenInfo } from "@mariposa/core";
import {
  SWAP_TOKEN_CACHE_TTL,
  SWAP_PRICE_CACHE_TTL,
  SWAP_FEE_BPS,
  SUPPORTED_SWAP_CHAINS,
} from "@mariposa/core";
import { cacheGet, cacheSet } from "../cache.js";

// ─── Config ─────────────────────────────────────────────────────

const ZEROX_API_KEY      = process.env["ZEROX_API_KEY"] ?? "";
const ZEROX_BASE_URL     = "https://api.0x.org/swap/allowance-holder/quote";
const SWAP_FEE_RECIPIENT = process.env["SWAP_FEE_RECIPIENT"] ?? "";

// Velora (ParaSwap) — no API key required
const VELORA_BASE_URL    = "https://api.paraswap.io";
const VELORA_PARTNER     = "mariposa";

// 1inch — optional, used for token lists and price lookups
const ONEINCH_BASE_URL   = "https://api.1inch.dev/swap/v6.0";
const ONEINCH_API_KEY    = process.env["ONEINCH_API_KEY"] ?? "";

// 0x allowance-holder unsupported chains (not needed for current 7-chain list, kept for safety)
const ZEROX_UNSUPPORTED  = new Set([250, 324]);
// Velora chain name mapping (uses names, not IDs in some endpoints)
const VELORA_NETWORK: Record<number, string> = {
  1: "ethereum", 10: "optimism", 56: "bsc", 137: "polygon",
  8453: "base", 42161: "arbitrum", 43114: "avalanche",
};

// ─── Schemas ────────────────────────────────────────────────────

const chainIdSchema = z.coerce
  .number()
  .refine(
    (v): v is (typeof SUPPORTED_SWAP_CHAINS)[number] =>
      (SUPPORTED_SWAP_CHAINS as readonly number[]).includes(v),
    { message: "Unsupported chain ID" }
  );

const quoteQuerySchema = z.object({
  src:      z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid source token address"),
  dst:      z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid destination token address"),
  amount:   z.string().regex(/^\d+$/, "Amount must be wei string"),
  from:     z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  slippage: z.coerce.number().min(0).max(50).default(2),
  aggregator: z.enum(["0x", "velora", "auto"]).optional().default("auto"),
  chainId:  chainIdSchema,
});

const tokensQuerySchema = z.object({ chainId: chainIdSchema });
const priceQuerySchema  = z.object({
  chainId:      chainIdSchema,
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

// ─── Rate Limit ─────────────────────────────────────────────────

const rateMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, max = 60): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) { rateMap.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

// ─── Normalised quote shape returned to frontend ─────────────────

interface NormalisedQuote {
  aggregator: string;
  sellToken:  string;
  buyToken:   string;
  sellAmount: string;
  buyAmount:  string;    // after fee deduction
  price:      string;    // buyToken per sellToken
  to:         string;
  data:       string;
  value:      string;
  gas:        string;
  feeBps:     number;
  feeRecipient: string;
  sources:    string[];
  issues?:    Record<string, unknown>;
  permit2?:   unknown;
}

// ─── 0x Aggregator ──────────────────────────────────────────────

async function quote0x(params: {
  chainId: number; sellToken: string; buyToken: string;
  sellAmount: string; taker: string; slippageBps: number;
}): Promise<NormalisedQuote> {
  const url = new URL(ZEROX_BASE_URL);
  url.searchParams.set("chainId",    String(params.chainId));
  url.searchParams.set("sellToken",  params.sellToken);
  url.searchParams.set("buyToken",   params.buyToken);
  url.searchParams.set("sellAmount", params.sellAmount);
  url.searchParams.set("taker",      params.taker);
  url.searchParams.set("slippageBps", String(params.slippageBps));
  if (SWAP_FEE_RECIPIENT) {
    url.searchParams.set("swapFeeBps",       String(SWAP_FEE_BPS));
    url.searchParams.set("swapFeeRecipient", SWAP_FEE_RECIPIENT);
    url.searchParams.set("swapFeeToken",     params.buyToken);
  }

  const res = await fetch(url.toString(), {
    headers: { "0x-api-key": ZEROX_API_KEY, "0x-version": "v2", Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`0x ${res.status}: ${await res.text()}`);

  const q = await res.json() as {
    sellAmount: string; buyAmount: string; price: string;
    guaranteedPrice?: string; to: string; data: string; value: string;
    estimatedGas: string; issues?: Record<string, unknown>; permit2?: unknown;
    route?: { fills: { source: string }[] };
  };

  return {
    aggregator:   "0x",
    sellToken:    params.sellToken,
    buyToken:     params.buyToken,
    sellAmount:   q.sellAmount,
    buyAmount:    q.buyAmount,
    price:        q.price,
    to:           q.to,
    data:         q.data,
    value:        q.value,
    gas:          q.estimatedGas,
    feeBps:       SWAP_FEE_BPS,
    feeRecipient: SWAP_FEE_RECIPIENT,
    sources:      q.route?.fills.map((f) => f.source) ?? [],
    issues:       q.issues ?? {},
    permit2:      q.permit2 ?? null,
  };
}

// ─── Velora (ParaSwap) Aggregator ───────────────────────────────

async function quoteVelora(params: {
  chainId: number; sellToken: string; buyToken: string;
  sellAmount: string; taker: string; slippage: number;  // percent e.g. 1 = 1%
}): Promise<NormalisedQuote> {
  // Step 1: /prices — get best route
  const priceUrl = new URL(`${VELORA_BASE_URL}/prices`);
  priceUrl.searchParams.set("network",        String(params.chainId));
  priceUrl.searchParams.set("srcToken",       params.sellToken);
  priceUrl.searchParams.set("destToken",      params.buyToken);
  priceUrl.searchParams.set("amount",         params.sellAmount);
  priceUrl.searchParams.set("side",           "SELL");
  priceUrl.searchParams.set("partner",        VELORA_PARTNER);
  if (SWAP_FEE_RECIPIENT) {
    priceUrl.searchParams.set("partnerFee",     String(SWAP_FEE_BPS / 100));  // Velora uses percent, e.g. 0.15
    priceUrl.searchParams.set("partnerAddress", SWAP_FEE_RECIPIENT);
  }

  console.log("[Velora /prices URL]", priceUrl.toString());
  const priceRes = await fetch(priceUrl.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!priceRes.ok) throw new Error(`Velora /prices ${priceRes.status}: ${await priceRes.text()}`);

  const priceData = await priceRes.json() as {
    priceRoute?: {
      destAmount: string; srcAmount: string; destUSD: string; srcUSD: string;
      bestRoute: { exchange: string }[][];
      gasCostUSD: string;
      tokenTransferProxy: string;
      contractAddress: string;
      contractMethod: string;
      srcToken: string; destToken: string;
    };
  };

  const route = priceData.priceRoute;
  if (!route) throw new Error("Velora: no priceRoute in response");

  // Step 2: /transactions — build the calldata
  // Apply slippage to get minimum acceptable output (not the full quoted amount).
  // Velora interprets destAmount as the floor — if on-chain price returns less, tx reverts.
  const minDestAmount = String(
    Math.floor(Number(route.destAmount) * (1 - params.slippage / 100))
  );

  const txBody: Record<string, unknown> = {
    srcToken:   params.sellToken,
    destToken:  params.buyToken,
    srcAmount:  params.sellAmount,
    destAmount: minDestAmount,
    priceRoute: route,
    userAddress: params.taker,
    partner:    VELORA_PARTNER,
    // partnerAddress needed in /transactions for fee routing (partnerFee NOT included — rejects it)
    ...(SWAP_FEE_RECIPIENT ? { partnerAddress: SWAP_FEE_RECIPIENT } : {}),
  };
  console.log("[Velora /transactions body]", JSON.stringify({ partner: txBody["partner"], partnerAddress: txBody["partnerAddress"], destAmount: txBody["destAmount"], chainId: params.chainId }));

  const txRes = await fetch(
    `${VELORA_BASE_URL}/transactions/${params.chainId}?ignoreChecks=true`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body:    JSON.stringify(txBody),
      signal:  AbortSignal.timeout(10000),
    }
  );
  if (!txRes.ok) throw new Error(`Velora /transactions ${txRes.status}: ${await txRes.text()}`);

  const txData = await txRes.json() as {
    from: string; to: string; value: string; data: string; gas: string; chainId: number;
  };

  // Extract sources from route
  const sources = route.bestRoute.flatMap((r: unknown) =>
    Array.isArray(r) ? (r as { exchange: string }[]).map((s) => s.exchange) : [(r as { exchange: string }).exchange]
  );

  // Price: destAmount / srcAmount (tokens, not wei-adjusted — close enough for comparison)
  const price = String(Number(route.destAmount) / Number(params.sellAmount));

  return {
    aggregator:   "velora",
    sellToken:    params.sellToken,
    buyToken:     params.buyToken,
    sellAmount:   params.sellAmount,
    buyAmount:    route.destAmount,
    price,
    to:           txData.to,
    data:         txData.data,
    value:        txData.value,
    gas:          txData.gas,
    feeBps:       SWAP_FEE_BPS,
    feeRecipient: SWAP_FEE_RECIPIENT,
    sources:      [...new Set(sources)],
  };
}

// ─── 1inch helper (token lists / price lookups only) ─────────────

async function fetchOneInch(chainId: number, endpoint: string, params?: Record<string, string>): Promise<Response> {
  const url = new URL(`${ONEINCH_BASE_URL}/${chainId}${endpoint}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return fetch(url.toString(), {
    headers: { Authorization: `Bearer ${ONEINCH_API_KEY}`, Accept: "application/json" },
  });
}

// ─── Fallback Token Lists ────────────────────────────────────────

type FT = { address: string; symbol: string; name: string; decimals: number; logoURI: string };
const ETH_LOGO  = "https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png";
const USDC_LOGO = "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png";
const USDT_LOGO = "https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png";
const DAI_LOGO  = "https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png";
const NATIVE_ETH: FT = { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "ETH", name: "Ethereum", decimals: 18, logoURI: ETH_LOGO };

const FALLBACK_TOKENS: Record<number, Record<string, FT>> = {
  1:     { "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": NATIVE_ETH, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: USDC_LOGO }, "0xdAC17F958D2ee523a2206206994597C13D831ec7": { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6, logoURI: USDT_LOGO }, "0x6B175474E89094C44Da98b954EedeAC495271d0F": { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai", decimals: 18, logoURI: DAI_LOGO }, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: ETH_LOGO } },
  10:    { "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": NATIVE_ETH, "0x4200000000000000000000000000000000000006": { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: ETH_LOGO }, "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85": { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: USDC_LOGO }, "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58": { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT", name: "Tether USD", decimals: 6, logoURI: USDT_LOGO }, "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1": { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai", decimals: 18, logoURI: DAI_LOGO }, "0x68f180fcCe6836688e9084f035309E29Bf0A2095": { address: "0x68f180fcCe6836688e9084f035309E29Bf0A2095", symbol: "WBTC", name: "Wrapped Bitcoin", decimals: 8, logoURI: "" } },
  56:    { "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "BNB", name: "BNB", decimals: 18, logoURI: "" }, "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d": { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18, logoURI: USDC_LOGO }, "0x55d398326f99059fF775485246999027B3197955": { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "USDT", decimals: 18, logoURI: USDT_LOGO }, "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3": { address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", symbol: "DAI", name: "Dai", decimals: 18, logoURI: DAI_LOGO }, "0x2170Ed0880ac9A755fd29B2688956BD959F933F8": { address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", symbol: "ETH", name: "Ethereum Token", decimals: 18, logoURI: ETH_LOGO }, "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c": { address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", symbol: "BTCB", name: "Binance-Peg BTCB", decimals: 18, logoURI: "" } },
  137:   { "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "MATIC", name: "Polygon", decimals: 18, logoURI: "" }, "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359": { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: USDC_LOGO }, "0xc2132D05D31c914a87C6611C10748AEb04B58e8F": { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether USD", decimals: 6, logoURI: USDT_LOGO }, "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063": { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", symbol: "DAI", name: "Dai", decimals: 18, logoURI: DAI_LOGO }, "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619": { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: ETH_LOGO }, "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6": { address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", symbol: "WBTC", name: "Wrapped Bitcoin", decimals: 8, logoURI: "" } },
  250:   { "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "FTM", name: "Fantom", decimals: 18, logoURI: "" }, "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75": { address: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: USDC_LOGO }, "0x049d68029688eAbF473097a2fC38ef61633A3C7A": { address: "0x049d68029688eAbF473097a2fC38ef61633A3C7A", symbol: "USDT", name: "Tether USD", decimals: 6, logoURI: USDT_LOGO }, "0x74b23882a30290451A17c44f4F05243b6b58C76d": { address: "0x74b23882a30290451A17c44f4F05243b6b58C76d", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: ETH_LOGO }, "0x321162Cd933E2Be498Cd2267a90534A804051b11": { address: "0x321162Cd933E2Be498Cd2267a90534A804051b11", symbol: "WBTC", name: "Wrapped Bitcoin", decimals: 8, logoURI: "" } },
  324:   { "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": NATIVE_ETH, "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4": { address: "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: USDC_LOGO }, "0x493257fD37EDB34451f62EDf8D2a0C418852bA4C": { address: "0x493257fD37EDB34451f62EDf8D2a0C418852bA4C", symbol: "USDT", name: "Tether USD", decimals: 6, logoURI: USDT_LOGO }, "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91": { address: "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: ETH_LOGO } },
  8453:  { "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": NATIVE_ETH, "0x4200000000000000000000000000000000000006": { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: ETH_LOGO }, "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: USDC_LOGO }, "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6Ca": { address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6Ca", symbol: "USDbC", name: "USD Base Coin", decimals: 6, logoURI: USDC_LOGO }, "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb": { address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", symbol: "DAI", name: "Dai", decimals: 18, logoURI: DAI_LOGO }, "0x940181a94A35A4569E4529A3CDfB74e38FD98631": { address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", symbol: "AERO", name: "Aerodrome", decimals: 18, logoURI: "" } },
  42161: { "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": NATIVE_ETH, "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1": { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: ETH_LOGO }, "0xaf88d065e77c8cC2239327C5EDb3A432268e5831": { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: USDC_LOGO }, "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8": { address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", symbol: "USDC.e", name: "Bridged USDC", decimals: 6, logoURI: USDC_LOGO }, "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1": { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai", decimals: 18, logoURI: DAI_LOGO }, "0x912CE59144191C1204E64559FE8253a0e49E6548": { address: "0x912CE59144191C1204E64559FE8253a0e49E6548", symbol: "ARB", name: "Arbitrum", decimals: 18, logoURI: "" } },
  43114: { "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "AVAX", name: "Avalanche", decimals: 18, logoURI: "" }, "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E": { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: USDC_LOGO } },
};

// ─── Route Registration ──────────────────────────────────────────

export function registerSwapRoutes(app: FastifyInstance) {
  /**
   * GET /swap/quote
   *
   * Queries 0x and Velora in parallel, returns the quote with the highest buyAmount.
   * Falls back to 1inch if both fail and ONEINCH_API_KEY is set.
   * API keys are never exposed to the frontend.
   */
  app.get("/swap/quote", async (request, reply) => {
    if (!checkRateLimit(request.ip)) {
      return reply.status(429).send({ error: "Too many requests. Please wait a moment before trying again." });
    }

    let query: z.infer<typeof quoteQuerySchema>;
    try { query = quoteQuerySchema.parse(request.query); }
    catch (err) { return reply.status(400).send({ error: "Invalid parameters", details: err }); }

    const slippageBps = Math.round(query.slippage * 100);
    const canUse0x    = !!ZEROX_API_KEY && !ZEROX_UNSUPPORTED.has(query.chainId);
    const canUseVelora = !!VELORA_NETWORK[query.chainId];
    // If user prefers a specific aggregator, restrict to that one (if available)
    const pref = query.aggregator ?? "auto";
    const use0x    = pref === "auto" ? canUse0x    : pref === "0x"     && canUse0x;
    const useVelora = pref === "auto" ? canUseVelora : pref === "velora" && canUseVelora;
    const use1inch = !!ONEINCH_API_KEY;

    if (!use0x && !useVelora && !use1inch) {
      return reply.status(503).send({ error: "No swap aggregator configured." });
    }

    // Run 0x and Velora in parallel
    const attempts: Promise<NormalisedQuote>[] = [];
    if (use0x) attempts.push(
      quote0x({ chainId: query.chainId, sellToken: query.src, buyToken: query.dst,
                 sellAmount: query.amount, taker: query.from, slippageBps })
    );
    if (useVelora) attempts.push(
      quoteVelora({ chainId: query.chainId, sellToken: query.src, buyToken: query.dst,
                    sellAmount: query.amount, taker: query.from, slippage: query.slippage })
    );

    const results = await Promise.allSettled(attempts);
    const successful = results.flatMap((r) =>
      r.status === "fulfilled" ? [r.value] : []
    );

    // Build allQuotes including failures so UI can show "aggregator: unavailable"
    const aggNames = [...(use0x ? ["0x"] : []), ...(useVelora ? ["velora"] : [])];
    const allQuotes = results.map((r, i) => {
      const agg = aggNames[i] ?? "unknown";
      if (r.status === "fulfilled") {
        return { aggregator: agg, success: true, buyAmount: r.value.buyAmount,
                 sources: r.value.sources, gas: r.value.gas };
      }
      app.log.warn({ err: String(r.reason) }, `${agg} quote failed`);
      return { aggregator: agg, success: false, error: String(r.reason).slice(0, 120) };
    });

    // Pick best quote by highest buyAmount
    if (successful.length > 0) {
      const best = successful.reduce((a, b) =>
        BigInt(b.buyAmount) > BigInt(a.buyAmount) ? b : a
      );

      app.log.info(
        { event: "swap_quote", aggregator: best.aggregator, chainId: query.chainId,
          quotesReceived: successful.length },
        "Swap quote served"
      );

      // Build response in SwapQuoteResponse shape expected by frontend
      const chainTokens = FALLBACK_TOKENS[query.chainId] ?? {};
      const lookupToken = (addr: string): TokenInfo =>
        chainTokens[addr] ?? chainTokens[addr.toLowerCase()] ??
        { address: addr, symbol: "TOKEN", name: "Token", decimals: 18, logoURI: "" };

      const fromTok = lookupToken(query.src);
      const toTok   = lookupToken(query.dst);
      // Human-readable exchange rate: dest_tokens / src_tokens (decimal adjusted)
      const humanExchangeRate = (
        (Number(best.buyAmount) / Math.pow(10, toTok.decimals)) /
        (Number(best.sellAmount) / Math.pow(10, fromTok.decimals))
      ).toFixed(6);
      const gasNum = best.gas ? Number(best.gas) : 200_000;

      return reply.send({ data: {
        fromToken:    fromTok,
        toToken:      toTok,
        fromAmount:   best.sellAmount,
        toAmount:     best.buyAmount,
        tx: {
          from:     query.from,
          to:       best.to,
          data:     best.data,
          value:    best.value,
          gas:      gasNum,
          gasPrice: "0",
        },
        estimatedGas: gasNum,
        exchangeRate: humanExchangeRate,
        aggregator:   best.aggregator,
        allQuotes,
      } });
    }

    // Both failed — try 1inch as last resort
    if (use1inch) {
      try {
        const params: Record<string, string> = {
          src: query.src, dst: query.dst, amount: query.amount,
          from: query.from, slippage: String(query.slippage), disableEstimate: "true",
        };
        if (SWAP_FEE_RECIPIENT) {
          params.referrer = SWAP_FEE_RECIPIENT;
          params.fee      = String(SWAP_FEE_BPS / 100);
        }
        const res = await fetchOneInch(query.chainId, "/swap", params);
        if (!res.ok) throw new Error(`1inch ${res.status}`);
        const raw = await res.json() as Record<string, unknown>;
        app.log.info({ event: "swap_quote", aggregator: "1inch", chainId: query.chainId }, "1inch fallback quote served");
        // 1inch returns SwapQuoteResponse-compatible shape natively
        return reply.send({ data: { ...raw, aggregator: "1inch", allQuotes: [{ aggregator: "1inch" }] } });
      } catch (err) {
        app.log.error({ err: String(err) }, "1inch fallback also failed");
      }
    }

    return reply.status(502).send({ error: "All aggregators failed. Try again or adjust your parameters." });
  });

  /**
   * GET /swap/quotes/all
   * Returns quotes from all available aggregators (for comparison UI).
   * Same logic as /swap/quote but always returns the full array.
   */
  app.get("/swap/quotes/all", async (request, reply) => {
    if (!checkRateLimit(request.ip, 5)) {
      return reply.status(429).send({ error: "Rate limit exceeded." });
    }

    let query: z.infer<typeof quoteQuerySchema>;
    try { query = quoteQuerySchema.parse(request.query); }
    catch (err) { return reply.status(400).send({ error: "Invalid parameters", details: err }); }

    const slippageBps = Math.round(query.slippage * 100);
    const promises: { name: string; p: Promise<NormalisedQuote> }[] = [];

    if (ZEROX_API_KEY && !ZEROX_UNSUPPORTED.has(query.chainId)) {
      promises.push({ name: "0x", p: quote0x({
        chainId: query.chainId, sellToken: query.src, buyToken: query.dst,
        sellAmount: query.amount, taker: query.from, slippageBps }) });
    }
    if (VELORA_NETWORK[query.chainId]) {
      promises.push({ name: "velora", p: quoteVelora({
        chainId: query.chainId, sellToken: query.src, buyToken: query.dst,
        sellAmount: query.amount, taker: query.from, slippage: query.slippage }) });
    }

    const settled = await Promise.allSettled(promises.map((x) => x.p));
    const quotes = settled.map((r, i) => {
      const name = promises[i]!.name;
      if (r.status === "fulfilled") {
        const { aggregator: _a, ...rest } = r.value;
        return { aggregator: name, success: true, ...rest };
      }
      return { aggregator: name, success: false, error: String(r.reason) };
    });

    return reply.send({ data: quotes });
  });

  /**
   * GET /swap/tokens — token list for a chain, cached 1hr.
   */
  app.get("/swap/tokens", async (request, reply) => {
    let query: z.infer<typeof tokensQuerySchema>;
    try { query = tokensQuerySchema.parse(request.query); }
    catch (err) { return reply.status(400).send({ error: "Invalid parameters", details: err }); }

    const cacheKey = `swap:tokens:${query.chainId}`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) return reply.send({ data: cached });

    if (ONEINCH_API_KEY) {
      try {
        const res = await fetchOneInch(query.chainId, "/tokens");
        if (res.ok) {
          const data = await res.json();
          await cacheSet(cacheKey, data, SWAP_TOKEN_CACHE_TTL);
          return reply.send({ data });
        }
      } catch { /* fall through */ }
    }

    const fallback = { tokens: FALLBACK_TOKENS[query.chainId] ?? {} };
    await cacheSet(cacheKey, fallback, SWAP_TOKEN_CACHE_TTL);
    return reply.send({ data: fallback });
  });

  /**
   * GET /swap/price — single token price, cached 30s.
   */
  app.get("/swap/price", async (request, reply) => {
    let query: z.infer<typeof priceQuerySchema>;
    try { query = priceQuerySchema.parse(request.query); }
    catch (err) { return reply.status(400).send({ error: "Invalid parameters", details: err }); }

    const cacheKey = `swap:price:${query.chainId}:${query.tokenAddress}`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) return reply.send({ data: cached });

    if (!ONEINCH_API_KEY) return reply.status(503).send({ error: "Price lookup unavailable." });

    const res = await fetch(
      `https://api.1inch.dev/price/v1.1/${query.chainId}/${query.tokenAddress}`,
      { headers: { Authorization: `Bearer ${ONEINCH_API_KEY}`, Accept: "application/json" } }
    );
    if (!res.ok) return reply.status(502).send({ error: "Price fetch failed." });

    const data = await res.json();
    await cacheSet(cacheKey, data, SWAP_PRICE_CACHE_TTL);
    return reply.send({ data });
  });
}
