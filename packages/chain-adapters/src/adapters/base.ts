import { createPublicClient, http, formatUnits } from "viem";
import { base } from "viem/chains";
import type { ChainAdapter, Pool, Position, Token } from "@mariposa/core";
import { PROTOCOLS, TOKENS, generatePoolId } from "@mariposa/core";
import {
  calculateBaseApy,
  calculateRewardApy,
  calculateLendingApy,
} from "@mariposa/apy-engine";
import { erc20Abi } from "../abis/erc20.js";
import {
  aerodromePoolAbi,
  aerodromeVoterAbi,
  aerodromeGaugeAbi,
} from "../abis/aerodrome.js";
import { aaveV3PoolDataProviderAbi } from "../abis/aaveV3.js";

const BASE_TOKENS = TOKENS[8453];
const BASE_PROTOCOLS = PROTOCOLS[8453];

/** Well-known Aerodrome pools on Base (top pools by TVL) */
const AERODROME_POOLS = [
  { address: "0xcDAC0d6c6C59727a65F871236188350531885C43" as const, name: "WETH/USDC" },
  { address: "0xB4885Bc63399BF5518b994c1d0C153334Ee579D0" as const, name: "WETH/USDbC" },
  { address: "0x6cDcb1C4A4D1C3C6d054b27AC5B77e89eAFb971d" as const, name: "AERO/USDC" },
];

/** Aave V3 tokens to track on Base */
const AAVE_BASE_TOKENS = [
  { symbol: "USDC", address: BASE_TOKENS.USDC },
  { symbol: "WETH", address: BASE_TOKENS.WETH },
  { symbol: "DAI", address: BASE_TOKENS.DAI },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPublicClient = ReturnType<typeof createPublicClient<any, any>>;

export class BaseAdapter implements ChainAdapter {
  readonly chainId = 8453 as const;
  readonly chainName = "Base";
  private client: AnyPublicClient;

  constructor(rpcUrl?: string) {
    this.client = createPublicClient({
      chain: base,
      transport: http(rpcUrl ?? process.env["BASE_RPC_URL"] ?? undefined),
    });
  }

  async getPoolData(): Promise<Pool[]> {
    const pools: Pool[] = [];

    const [aeroPools, aavePools] = await Promise.allSettled([
      this.fetchAerodromePools(),
      this.fetchAavePools(),
    ]);

    if (aeroPools.status === "fulfilled") {
      pools.push(...aeroPools.value);
    } else {
      console.error("[BaseAdapter] Failed to fetch Aerodrome pools:", aeroPools.reason);
    }

    if (aavePools.status === "fulfilled") {
      pools.push(...aavePools.value);
    } else {
      console.error("[BaseAdapter] Failed to fetch Aave pools:", aavePools.reason);
    }

    return pools;
  }

  async getUserPositions(_address: string): Promise<Position[]> {
    // Phase 1: Read-only — return empty for now.
    // Phase 2 will read on-chain balances and gauge positions.
    return [];
  }

  async getTokenPrice(_tokenAddress: string): Promise<number> {
    // TODO: Integrate Chainlink price feeds or CoinGecko API
    // For now, return hardcoded prices for known tokens
    return 0;
  }

  // ─── Private: Aerodrome ───────────────────────────────────────

  private async fetchAerodromePools(): Promise<Pool[]> {
    const pools: Pool[] = [];

    for (const poolInfo of AERODROME_POOLS) {
      try {
        const pool = await this.fetchSingleAerodromePool(poolInfo.address, poolInfo.name);
        if (pool) pools.push(pool);
      } catch (err) {
        console.error(`[BaseAdapter] Error fetching Aerodrome pool ${poolInfo.name}:`, err);
      }
    }

    return pools;
  }

  private async fetchSingleAerodromePool(
    poolAddress: `0x${string}`,
    name: string
  ): Promise<Pool | null> {
    const [token0Addr, token1Addr, reserves, isStable] = await Promise.all([
      this.client.readContract({
        address: poolAddress,
        abi: aerodromePoolAbi,
        functionName: "token0",
      }),
      this.client.readContract({
        address: poolAddress,
        abi: aerodromePoolAbi,
        functionName: "token1",
      }),
      this.client.readContract({
        address: poolAddress,
        abi: aerodromePoolAbi,
        functionName: "getReserves",
      }),
      this.client.readContract({
        address: poolAddress,
        abi: aerodromePoolAbi,
        functionName: "stable",
      }),
    ]);

    const [token0Info, token1Info] = await Promise.all([
      this.fetchTokenInfo(token0Addr),
      this.fetchTokenInfo(token1Addr),
    ]);

    // Estimate TVL from reserves (simplified — real implementation uses price feeds)
    const reserve0 = Number(formatUnits(reserves[0], token0Info.decimals));
    const reserve1 = Number(formatUnits(reserves[1], token1Info.decimals));

    // For now, assume stablecoin pairs have $1 per token, ETH ~ $3000
    // TODO: Replace with real price feeds
    const price0 = this.estimateTokenPrice(token0Info.symbol);
    const price1 = this.estimateTokenPrice(token1Info.symbol);
    const tvl = reserve0 * price0 + reserve1 * price1;

    // Fetch AERO reward rate from gauge
    let rewardApy = 0;
    try {
      const gaugeAddr = await this.client.readContract({
        address: BASE_PROTOCOLS.aerodrome.voter as `0x${string}`,
        abi: aerodromeVoterAbi,
        functionName: "gauges",
        args: [poolAddress],
      });

      if (gaugeAddr !== "0x0000000000000000000000000000000000000000") {
        const rewardRate = await this.client.readContract({
          address: gaugeAddr,
          abi: aerodromeGaugeAbi,
          functionName: "rewardRate",
        });
        const aeroPrice = this.estimateTokenPrice("AERO");
        rewardApy = calculateRewardApy(
          Number(formatUnits(rewardRate, 18)),
          aeroPrice,
          tvl
        );
      }
    } catch {
      // Gauge may not exist for all pools
    }

    // Fee tier: Aerodrome volatile = 0.3%, stable = 0.04%
    const feeBps = isStable ? 4 : 30;
    // Estimate 24h volume as ~2% of TVL for now (will be replaced with real data)
    const estimatedVolume24h = tvl * 0.02;
    const baseApy = calculateBaseApy(estimatedVolume24h, feeBps, tvl);

    return {
      id: generatePoolId(8453, "aerodrome", poolAddress),
      chain: 8453,
      protocol: "aerodrome",
      type: "dex",
      name,
      tokens: [token0Info, token1Info],
      apy: {
        base: baseApy,
        reward: rewardApy,
        total: baseApy + rewardApy,
      },
      tvl,
      riskScore: isStable ? 2 : 4,
      contractAddress: poolAddress,
      feeTier: feeBps,
      url: `https://aerodrome.finance/deposit?token0=${token0Addr}&token1=${token1Addr}&stable=${isStable}`,
      updatedAt: Date.now(),
    };
  }

  // ─── Private: Aave V3 ────────────────────────────────────────

  private async fetchAavePools(): Promise<Pool[]> {
    const pools: Pool[] = [];

    for (const token of AAVE_BASE_TOKENS) {
      try {
        const reserveData = await this.client.readContract({
          address: BASE_PROTOCOLS.aaveV3.poolDataProvider as `0x${string}`,
          abi: aaveV3PoolDataProviderAbi,
          functionName: "getReserveData",
          args: [token.address as `0x${string}`],
        });

        const liquidityRate = reserveData[5]; // liquidityRate in RAY
        const totalAToken = reserveData[2];
        const tokenInfo = await this.fetchTokenInfo(token.address as `0x${string}`);
        const tokenPrice = this.estimateTokenPrice(token.symbol);
        const tvl =
          Number(formatUnits(totalAToken, tokenInfo.decimals)) * tokenPrice;

        const supplyApy = calculateLendingApy(liquidityRate);

        pools.push({
          id: generatePoolId(8453, "aave-v3", token.address),
          chain: 8453,
          protocol: "aave-v3",
          type: "lending",
          name: `${token.symbol} Supply`,
          tokens: [tokenInfo],
          apy: {
            base: supplyApy,
            reward: 0,
            total: supplyApy,
          },
          tvl,
          riskScore: 2,
          contractAddress: BASE_PROTOCOLS.aaveV3.pool,
          url: `https://app.aave.com/reserve-overview/?underlyingAsset=${token.address}&marketName=proto_base_v3`,
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.error(`[BaseAdapter] Error fetching Aave ${token.symbol}:`, err);
      }
    }

    return pools;
  }

  // ─── Private: Helpers ─────────────────────────────────────────

  private async fetchTokenInfo(address: `0x${string}`): Promise<Token> {
    const [symbol, decimals] = await Promise.all([
      this.client.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
      this.client.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
    ]);

    return {
      address,
      symbol,
      name: symbol, // Simplified — would use a token list in production
      decimals,
      chainId: 8453,
      priceUsd: this.estimateTokenPrice(symbol),
    };
  }

  /**
   * Placeholder price estimation. Will be replaced with Chainlink/CoinGecko feeds.
   */
  private estimateTokenPrice(symbol: string): number {
    const prices: Record<string, number> = {
      WETH: 3000,
      ETH: 3000,
      USDC: 1,
      "USDC.e": 1,
      USDbC: 1,
      DAI: 1,
      AERO: 1.5,
      ARB: 1.2,
      GRAIL: 200,
    };
    return prices[symbol] ?? 0;
  }
}
