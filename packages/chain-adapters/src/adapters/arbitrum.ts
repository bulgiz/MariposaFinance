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
import { uniswapV3FactoryAbi, uniswapV3PoolAbi } from "../abis/uniswapV3.js";
import { priceService } from "../price-service.js";

const ARB_TOKENS = TOKENS[42161];
const ARB_PROTOCOLS = PROTOCOLS[42161];

/** Well-known Camelot pools on Arbitrum */
const CAMELOT_POOLS = [
  { address: "0x84652bb2539513BAf36e225c930Fdd8eaa63CE27" as const, name: "WETH/USDC" },
  { address: "0xa6c5C7D189fA4eB5Af8ba34E63dCDD3a635D433f" as const, name: "WETH/ARB" },
  { address: "0x1F1Ca4e8236CD13032653391dB7e9544a6ad123E" as const, name: "GRAIL/WETH" },
];

/** Uniswap V3 pools to track on Arbitrum */
const UNISWAP_V3_POOLS = [
  { tokenA: ARB_TOKENS.WETH, tokenB: ARB_TOKENS.USDC, fee: 500, name: "WETH/USDC" },
  { tokenA: ARB_TOKENS.WETH, tokenB: ARB_TOKENS.USDC, fee: 3000, name: "WETH/USDC" },
  { tokenA: ARB_TOKENS.WETH, tokenB: ARB_TOKENS.ARB, fee: 3000, name: "WETH/ARB" },
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

    const [camelotPools, uniV3Pools, aavePools] = await Promise.allSettled([
      this.fetchCamelotPools(),
      this.fetchUniswapV3Pools(),
      this.fetchAavePools(),
    ]);

    if (camelotPools.status === "fulfilled") {
      pools.push(...camelotPools.value);
    } else {
      console.error("[ArbitrumAdapter] Failed to fetch Camelot pools:", camelotPools.reason);
    }

    if (uniV3Pools.status === "fulfilled") {
      pools.push(...uniV3Pools.value);
    } else {
      console.error("[ArbitrumAdapter] Failed to fetch Uniswap V3 pools:", uniV3Pools.reason);
    }

    if (aavePools.status === "fulfilled") {
      pools.push(...aavePools.value);
    } else {
      console.error("[ArbitrumAdapter] Failed to fetch Aave pools:", aavePools.reason);
    }

    return pools;
  }

  async getUserPositions(address: string): Promise<Position[]> {
    const positions: Position[] = [];
    const userAddr = address as `0x${string}`;

    const [aavePositions, camelotPositions] = await Promise.allSettled([
      this.fetchAaveUserPositions(userAddr),
      this.fetchCamelotUserPositions(userAddr),
    ]);

    if (aavePositions.status === "fulfilled") {
      positions.push(...aavePositions.value);
    } else {
      console.error("[ArbitrumAdapter] Failed to fetch Aave positions:", aavePositions.reason);
    }

    if (camelotPositions.status === "fulfilled") {
      positions.push(...camelotPositions.value);
    } else {
      console.error("[ArbitrumAdapter] Failed to fetch Camelot positions:", camelotPositions.reason);
    }

    return positions;
  }

  async getTokenPrice(tokenAddress: string): Promise<number> {
    try {
      const symbol = await this.client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "symbol",
      });
      return priceService.getPrice(symbol);
    } catch {
      return 0;
    }
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
    const price0 = await priceService.getPrice(token0Info.symbol);
    const price1 = await priceService.getPrice(token1Info.symbol);
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

  // ─── Private: Uniswap V3 ─────────────────────────────────────

  private async fetchUniswapV3Pools(): Promise<Pool[]> {
    const pools: Pool[] = [];

    for (const poolDef of UNISWAP_V3_POOLS) {
      try {
        const poolAddress = await this.client.readContract({
          address: ARB_PROTOCOLS.uniswapV3.factory as `0x${string}`,
          abi: uniswapV3FactoryAbi,
          functionName: "getPool",
          args: [
            poolDef.tokenA as `0x${string}`,
            poolDef.tokenB as `0x${string}`,
            poolDef.fee,
          ],
        });

        if (poolAddress === "0x0000000000000000000000000000000000000000") continue;

        const pool = await this.fetchSingleUniV3Pool(
          poolAddress,
          poolDef.name,
          poolDef.fee
        );
        if (pool) pools.push(pool);
      } catch (err) {
        console.error(
          `[ArbitrumAdapter] Error fetching Uni V3 pool ${poolDef.name} (${poolDef.fee}):`,
          err
        );
      }
    }

    return pools;
  }

  private async fetchSingleUniV3Pool(
    poolAddress: `0x${string}`,
    name: string,
    feeTier: number
  ): Promise<Pool | null> {
    const [token0Addr, token1Addr, liquidity] = await Promise.all([
      this.client.readContract({
        address: poolAddress,
        abi: uniswapV3PoolAbi,
        functionName: "token0",
      }),
      this.client.readContract({
        address: poolAddress,
        abi: uniswapV3PoolAbi,
        functionName: "token1",
      }),
      this.client.readContract({
        address: poolAddress,
        abi: uniswapV3PoolAbi,
        functionName: "liquidity",
      }),
    ]);

    if (liquidity === 0n) return null;

    const [token0Info, token1Info] = await Promise.all([
      this.fetchTokenInfo(token0Addr),
      this.fetchTokenInfo(token1Addr),
    ]);

    const [balance0, balance1] = await Promise.all([
      this.client.readContract({
        address: token0Addr,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [poolAddress],
      }),
      this.client.readContract({
        address: token1Addr,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [poolAddress],
      }),
    ]);

    const amount0 = Number(formatUnits(balance0, token0Info.decimals));
    const amount1 = Number(formatUnits(balance1, token1Info.decimals));
    const price0 = await priceService.getPrice(token0Info.symbol);
    const price1 = await priceService.getPrice(token1Info.symbol);
    const tvl = amount0 * price0 + amount1 * price1;

    const feeBps = feeTier / 100;
    const estimatedVolume24h = tvl * 0.015;
    const baseApy = calculateBaseApy(estimatedVolume24h, feeBps, tvl);

    const feeLabel = feeTier === 500 ? "0.05%" : feeTier === 3000 ? "0.30%" : `${feeTier / 10000}%`;

    return {
      id: generatePoolId(42161, "uniswap-v3", poolAddress),
      chain: 42161,
      protocol: "uniswap-v3",
      type: "dex",
      name: `${name} (${feeLabel})`,
      tokens: [token0Info, token1Info],
      apy: {
        base: baseApy,
        reward: 0,
        total: baseApy,
      },
      tvl,
      riskScore: 3,
      contractAddress: poolAddress,
      feeTier,
      url: `https://app.uniswap.org/pools?chain=arbitrum`,
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
        const tokenPrice = await priceService.getPrice(token.symbol);
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

  // ─── Private: User Positions ──────────────────────────────────

  private async fetchAaveUserPositions(user: `0x${string}`): Promise<Position[]> {
    const positions: Position[] = [];

    for (const token of AAVE_ARB_TOKENS) {
      try {
        const userData = await this.client.readContract({
          address: ARB_PROTOCOLS.aaveV3.poolDataProvider as `0x${string}`,
          abi: aaveV3PoolDataProviderAbi,
          functionName: "getUserReserveData",
          args: [token.address as `0x${string}`, user],
        });

        const aTokenBalance = userData[0];
        if (aTokenBalance === 0n) continue;

        const tokenInfo = await this.fetchTokenInfo(token.address as `0x${string}`);
        const tokenPrice = await priceService.getPrice(token.symbol);
        const amount = Number(formatUnits(aTokenBalance, tokenInfo.decimals));
        const valueUsd = amount * tokenPrice;

        const reserveData = await this.client.readContract({
          address: ARB_PROTOCOLS.aaveV3.poolDataProvider as `0x${string}`,
          abi: aaveV3PoolDataProviderAbi,
          functionName: "getReserveData",
          args: [token.address as `0x${string}`],
        });

        const supplyApy = calculateLendingApy(reserveData[5]);

        const pool: Pool = {
          id: generatePoolId(42161, "aave-v3", token.address),
          chain: 42161,
          protocol: "aave-v3",
          type: "lending",
          name: `${token.symbol} Supply`,
          tokens: [tokenInfo],
          apy: { base: supplyApy, reward: 0, total: supplyApy },
          tvl: Number(formatUnits(reserveData[2], tokenInfo.decimals)) * tokenPrice,
          riskScore: 2,
          contractAddress: ARB_PROTOCOLS.aaveV3.pool,
          url: `https://app.aave.com/reserve-overview/?underlyingAsset=${token.address}&marketName=proto_arbitrum_v3`,
          updatedAt: Date.now(),
        };

        positions.push({
          pool,
          deposited: valueUsd,
          earned: 0,
          tokens: [{ symbol: token.symbol, amount, valueUsd }],
        });
      } catch (err) {
        console.error(`[ArbitrumAdapter] Error fetching Aave position for ${token.symbol}:`, err);
      }
    }

    return positions;
  }

  private async fetchCamelotUserPositions(user: `0x${string}`): Promise<Position[]> {
    const positions: Position[] = [];

    for (const poolInfo of CAMELOT_POOLS) {
      try {
        const lpBalance = await this.client.readContract({
          address: poolInfo.address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [user],
        });

        if (lpBalance === 0n) continue;

        const [totalSupply, reserves] = await Promise.all([
          this.client.readContract({
            address: poolInfo.address,
            abi: camelotPairAbi,
            functionName: "totalSupply",
          }),
          this.client.readContract({
            address: poolInfo.address,
            abi: camelotPairAbi,
            functionName: "getReserves",
          }),
        ]);

        const [token0Addr, token1Addr] = await Promise.all([
          this.client.readContract({ address: poolInfo.address, abi: camelotPairAbi, functionName: "token0" }),
          this.client.readContract({ address: poolInfo.address, abi: camelotPairAbi, functionName: "token1" }),
        ]);

        const [token0Info, token1Info] = await Promise.all([
          this.fetchTokenInfo(token0Addr),
          this.fetchTokenInfo(token1Addr),
        ]);

        const reserve0 = Number(formatUnits(reserves[0], token0Info.decimals));
        const reserve1 = Number(formatUnits(reserves[1], token1Info.decimals));
        const price0 = await priceService.getPrice(token0Info.symbol);
        const price1 = await priceService.getPrice(token1Info.symbol);

        const userShare = totalSupply > 0n
          ? Number(lpBalance) / Number(totalSupply)
          : 0;

        const userAmount0 = reserve0 * userShare;
        const userAmount1 = reserve1 * userShare;
        const depositedUsd = userAmount0 * price0 + userAmount1 * price1;

        const pool = await this.fetchSingleCamelotPool(poolInfo.address, poolInfo.name);
        if (!pool) continue;

        positions.push({
          pool,
          deposited: depositedUsd,
          earned: 0,
          tokens: [
            { symbol: token0Info.symbol, amount: userAmount0, valueUsd: userAmount0 * price0 },
            { symbol: token1Info.symbol, amount: userAmount1, valueUsd: userAmount1 * price1 },
          ],
        });
      } catch (err) {
        console.error(`[ArbitrumAdapter] Error fetching Camelot position for ${poolInfo.name}:`, err);
      }
    }

    return positions;
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
      priceUsd: await priceService.getPrice(symbol),
    };
  }
}
