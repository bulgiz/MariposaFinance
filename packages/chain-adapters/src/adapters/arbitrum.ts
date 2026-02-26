import { createPublicClient, http, formatUnits } from "viem";
import { arbitrum } from "viem/chains";
import type { ChainAdapter, Pool, Position, Token } from "@mariposa/core";
import { PROTOCOLS, TOKENS, generatePoolId } from "@mariposa/core";
import {
  calculateBaseApy,
  calculateLendingApy,
} from "@mariposa/apy-engine";
import { erc20Abi } from "../abis/erc20.js";
import { camelotPairAbi } from "../abis/camelot.js";
import { aaveV3PoolDataProviderAbi } from "../abis/aaveV3.js";

const ARB_TOKENS = TOKENS[42161];
const ARB_PROTOCOLS = PROTOCOLS[42161];

/** Well-known Camelot pools on Arbitrum */
const CAMELOT_POOLS = [
  { address: "0x84652bb2539513BAf36e225c930Fdd8eaa63CE27" as const, name: "WETH/USDC" },
  { address: "0xa6c5C7D189fA4eB5Af8ba34E63dCDD3a635D433f" as const, name: "WETH/ARB" },
  { address: "0x1F1Ca4e8236CD13032653391dB7e9544a6ad123E" as const, name: "GRAIL/WETH" },
];

/** Aave V3 tokens to track on Arbitrum */
const AAVE_ARB_TOKENS = [
  { symbol: "USDC", address: ARB_TOKENS.USDC },
  { symbol: "WETH", address: ARB_TOKENS.WETH },
  { symbol: "DAI", address: ARB_TOKENS.DAI },
  { symbol: "ARB", address: ARB_TOKENS.ARB },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPublicClient = ReturnType<typeof createPublicClient<any, any>>;

export class ArbitrumAdapter implements ChainAdapter {
  readonly chainId = 42161 as const;
  readonly chainName = "Arbitrum";
  private client: AnyPublicClient;

  constructor(rpcUrl?: string) {
    this.client = createPublicClient({
      chain: arbitrum,
      transport: http(rpcUrl ?? process.env["ARBITRUM_RPC_URL"] ?? undefined),
    });
  }

  async getPoolData(): Promise<Pool[]> {
    const pools: Pool[] = [];

    const [camelotPools, aavePools] = await Promise.allSettled([
      this.fetchCamelotPools(),
      this.fetchAavePools(),
    ]);

    if (camelotPools.status === "fulfilled") {
      pools.push(...camelotPools.value);
    } else {
      console.error("[ArbitrumAdapter] Failed to fetch Camelot pools:", camelotPools.reason);
    }

    if (aavePools.status === "fulfilled") {
      pools.push(...aavePools.value);
    } else {
      console.error("[ArbitrumAdapter] Failed to fetch Aave pools:", aavePools.reason);
    }

    return pools;
  }

  async getUserPositions(_address: string): Promise<Position[]> {
    return [];
  }

  async getTokenPrice(_tokenAddress: string): Promise<number> {
    return 0;
  }

  // ─── Private: Camelot ─────────────────────────────────────────

  private async fetchCamelotPools(): Promise<Pool[]> {
    const pools: Pool[] = [];

    for (const poolInfo of CAMELOT_POOLS) {
      try {
        const pool = await this.fetchSingleCamelotPool(poolInfo.address, poolInfo.name);
        if (pool) pools.push(pool);
      } catch (err) {
        console.error(`[ArbitrumAdapter] Error fetching Camelot pool ${poolInfo.name}:`, err);
      }
    }

    return pools;
  }

  private async fetchSingleCamelotPool(
    poolAddress: `0x${string}`,
    name: string
  ): Promise<Pool | null> {
    const [token0Addr, token1Addr, reserves] = await Promise.all([
      this.client.readContract({
        address: poolAddress,
        abi: camelotPairAbi,
        functionName: "token0",
      }),
      this.client.readContract({
        address: poolAddress,
        abi: camelotPairAbi,
        functionName: "token1",
      }),
      this.client.readContract({
        address: poolAddress,
        abi: camelotPairAbi,
        functionName: "getReserves",
      }),
    ]);

    const [token0Info, token1Info] = await Promise.all([
      this.fetchTokenInfo(token0Addr),
      this.fetchTokenInfo(token1Addr),
    ]);

    const reserve0 = Number(formatUnits(reserves[0], token0Info.decimals));
    const reserve1 = Number(formatUnits(reserves[1], token1Info.decimals));
    const price0 = this.estimateTokenPrice(token0Info.symbol);
    const price1 = this.estimateTokenPrice(token1Info.symbol);
    const tvl = reserve0 * price0 + reserve1 * price1;

    // Camelot uses dynamic fee tiers from reserves response
    const feePercent0 = Number(reserves[3]);
    const feePercent1 = Number(reserves[4]);
    const avgFeeBps = Math.round((feePercent0 + feePercent1) / 2);

    const estimatedVolume24h = tvl * 0.02;
    const baseApy = calculateBaseApy(estimatedVolume24h, avgFeeBps, tvl);

    return {
      id: generatePoolId(42161, "camelot", poolAddress),
      chain: 42161,
      protocol: "camelot",
      type: "dex",
      name,
      tokens: [token0Info, token1Info],
      apy: {
        base: baseApy,
        reward: 0, // Camelot spNFT rewards tracked separately
        total: baseApy,
      },
      tvl,
      riskScore: 4,
      contractAddress: poolAddress,
      feeTier: avgFeeBps,
      url: `https://app.camelot.exchange/liquidity/${poolAddress}`,
      updatedAt: Date.now(),
    };
  }

  // ─── Private: Aave V3 ────────────────────────────────────────

  private async fetchAavePools(): Promise<Pool[]> {
    const pools: Pool[] = [];

    for (const token of AAVE_ARB_TOKENS) {
      try {
        const reserveData = await this.client.readContract({
          address: ARB_PROTOCOLS.aaveV3.poolDataProvider as `0x${string}`,
          abi: aaveV3PoolDataProviderAbi,
          functionName: "getReserveData",
          args: [token.address as `0x${string}`],
        });

        const liquidityRate = reserveData[5];
        const totalAToken = reserveData[2];
        const tokenInfo = await this.fetchTokenInfo(token.address as `0x${string}`);
        const tokenPrice = this.estimateTokenPrice(token.symbol);
        const tvl =
          Number(formatUnits(totalAToken, tokenInfo.decimals)) * tokenPrice;

        const supplyApy = calculateLendingApy(liquidityRate);

        pools.push({
          id: generatePoolId(42161, "aave-v3", token.address),
          chain: 42161,
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
          contractAddress: ARB_PROTOCOLS.aaveV3.pool,
          url: `https://app.aave.com/reserve-overview/?underlyingAsset=${token.address}&marketName=proto_arbitrum_v3`,
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.error(`[ArbitrumAdapter] Error fetching Aave ${token.symbol}:`, err);
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
      name: symbol,
      decimals,
      chainId: 42161,
      priceUsd: this.estimateTokenPrice(symbol),
    };
  }

  private estimateTokenPrice(symbol: string): number {
    const prices: Record<string, number> = {
      WETH: 3000,
      ETH: 3000,
      USDC: 1,
      "USDC.e": 1,
      USDbC: 1,
      DAI: 1,
      ARB: 1.2,
      GRAIL: 200,
      AERO: 1.5,
    };
    return prices[symbol] ?? 0;
  }
}
