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
import { uniswapV3FactoryAbi, uniswapV3PoolAbi } from "../abis/uniswapV3.js";
import { priceService } from "../price-service.js";

const BASE_TOKENS = TOKENS[8453];
const BASE_PROTOCOLS = PROTOCOLS[8453];

/** Well-known Aerodrome pools on Base (top pools by TVL) */
const AERODROME_POOLS = [
  { address: "0xcDAC0d6c6C59727a65F871236188350531885C43" as const, name: "WETH/USDC" },
  { address: "0xB4885Bc63399BF5518b994c1d0C153334Ee579D0" as const, name: "WETH/USDbC" },
  { address: "0x6cDcb1C4A4D1C3C6d054b27AC5B77e89eAFb971d" as const, name: "AERO/USDC" },
];

/** Uniswap V3 pools to track on Base (token pairs + fee tier) */
const UNISWAP_V3_POOLS = [
  { tokenA: BASE_TOKENS.WETH, tokenB: BASE_TOKENS.USDC, fee: 500, name: "WETH/USDC" },
  { tokenA: BASE_TOKENS.WETH, tokenB: BASE_TOKENS.USDC, fee: 3000, name: "WETH/USDC" },
  { tokenA: BASE_TOKENS.WETH, tokenB: BASE_TOKENS.DAI, fee: 3000, name: "WETH/DAI" },
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

    const [aeroPools, uniV3Pools, aavePools] = await Promise.allSettled([
      this.fetchAerodromePools(),
      this.fetchUniswapV3Pools(),
      this.fetchAavePools(),
    ]);

    if (aeroPools.status === "fulfilled") {
      pools.push(...aeroPools.value);
    } else {
      console.error("[BaseAdapter] Failed to fetch Aerodrome pools:", aeroPools.reason);
    }

    if (uniV3Pools.status === "fulfilled") {
      pools.push(...uniV3Pools.value);
    } else {
      console.error("[BaseAdapter] Failed to fetch Uniswap V3 pools:", uniV3Pools.reason);
    }

    if (aavePools.status === "fulfilled") {
      pools.push(...aavePools.value);
    } else {
      console.error("[BaseAdapter] Failed to fetch Aave pools:", aavePools.reason);
    }

    return pools;
  }

  async getUserPositions(address: string): Promise<Position[]> {
    const positions: Position[] = [];
    const userAddr = address as `0x${string}`;

    const [aavePositions, aeroPositions] = await Promise.allSettled([
      this.fetchAaveUserPositions(userAddr),
      this.fetchAerodromeUserPositions(userAddr),
    ]);

    if (aavePositions.status === "fulfilled") {
      positions.push(...aavePositions.value);
    } else {
      console.error("[BaseAdapter] Failed to fetch Aave positions:", aavePositions.reason);
    }

    if (aeroPositions.status === "fulfilled") {
      positions.push(...aeroPositions.value);
    } else {
      console.error("[BaseAdapter] Failed to fetch Aerodrome positions:", aeroPositions.reason);
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

    const reserve0 = Number(formatUnits(reserves[0], token0Info.decimals));
    const reserve1 = Number(formatUnits(reserves[1], token1Info.decimals));

    const price0 = await priceService.getPrice(token0Info.symbol);
    const price1 = await priceService.getPrice(token1Info.symbol);
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
        const aeroPrice = await priceService.getPrice("AERO");
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

  // ─── Private: Uniswap V3 ─────────────────────────────────────

  private async fetchUniswapV3Pools(): Promise<Pool[]> {
    const pools: Pool[] = [];

    for (const poolDef of UNISWAP_V3_POOLS) {
      try {
        const poolAddress = await this.client.readContract({
          address: BASE_PROTOCOLS.uniswapV3.factory as `0x${string}`,
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
          `[BaseAdapter] Error fetching Uni V3 pool ${poolDef.name} (${poolDef.fee}):`,
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

    // Estimate TVL from pool balances
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

    // Fee tier expressed in hundredths of a bip (500 = 0.05%, 3000 = 0.30%)
    const feeBps = feeTier / 100;
    const estimatedVolume24h = tvl * 0.015;
    const baseApy = calculateBaseApy(estimatedVolume24h, feeBps, tvl);

    const feeLabel = feeTier === 500 ? "0.05%" : feeTier === 3000 ? "0.30%" : `${feeTier / 10000}%`;

    return {
      id: generatePoolId(8453, "uniswap-v3", poolAddress),
      chain: 8453,
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
      url: `https://app.uniswap.org/pools?chain=base`,
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
        const tokenPrice = await priceService.getPrice(token.symbol);
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

  // ─── Private: User Positions ──────────────────────────────────

  private async fetchAaveUserPositions(user: `0x${string}`): Promise<Position[]> {
    const positions: Position[] = [];

    for (const token of AAVE_BASE_TOKENS) {
      try {
        const userData = await this.client.readContract({
          address: BASE_PROTOCOLS.aaveV3.poolDataProvider as `0x${string}`,
          abi: aaveV3PoolDataProviderAbi,
          functionName: "getUserReserveData",
          args: [token.address as `0x${string}`, user],
        });

        const aTokenBalance = userData[0]; // currentATokenBalance
        if (aTokenBalance === 0n) continue;

        const tokenInfo = await this.fetchTokenInfo(token.address as `0x${string}`);
        const tokenPrice = await priceService.getPrice(token.symbol);
        const amount = Number(formatUnits(aTokenBalance, tokenInfo.decimals));
        const valueUsd = amount * tokenPrice;

        // Look up the matching pool to attach to the position
        const reserveData = await this.client.readContract({
          address: BASE_PROTOCOLS.aaveV3.poolDataProvider as `0x${string}`,
          abi: aaveV3PoolDataProviderAbi,
          functionName: "getReserveData",
          args: [token.address as `0x${string}`],
        });

        const supplyApy = calculateLendingApy(reserveData[5]);

        const pool: Pool = {
          id: generatePoolId(8453, "aave-v3", token.address),
          chain: 8453,
          protocol: "aave-v3",
          type: "lending",
          name: `${token.symbol} Supply`,
          tokens: [tokenInfo],
          apy: { base: supplyApy, reward: 0, total: supplyApy },
          tvl: Number(formatUnits(reserveData[2], tokenInfo.decimals)) * tokenPrice,
          riskScore: 2,
          contractAddress: BASE_PROTOCOLS.aaveV3.pool,
          url: `https://app.aave.com/reserve-overview/?underlyingAsset=${token.address}&marketName=proto_base_v3`,
          updatedAt: Date.now(),
        };

        positions.push({
          pool,
          deposited: valueUsd,
          earned: 0, // Aave earnings are embedded in the aToken balance growth
          tokens: [{ symbol: token.symbol, amount, valueUsd }],
        });
      } catch (err) {
        console.error(`[BaseAdapter] Error fetching Aave position for ${token.symbol}:`, err);
      }
    }

    return positions;
  }

  private async fetchAerodromeUserPositions(user: `0x${string}`): Promise<Position[]> {
    const positions: Position[] = [];

    for (const poolInfo of AERODROME_POOLS) {
      try {
        // Find the gauge for this pool
        const gaugeAddr = await this.client.readContract({
          address: BASE_PROTOCOLS.aerodrome.voter as `0x${string}`,
          abi: aerodromeVoterAbi,
          functionName: "gauges",
          args: [poolInfo.address],
        });

        if (gaugeAddr === "0x0000000000000000000000000000000000000000") continue;

        // Check user's staked balance in the gauge
        const [stakedBalance, earnedRewards] = await Promise.all([
          this.client.readContract({
            address: gaugeAddr,
            abi: aerodromeGaugeAbi,
            functionName: "balanceOf",
            args: [user],
          }),
          this.client.readContract({
            address: gaugeAddr,
            abi: aerodromeGaugeAbi,
            functionName: "earned",
            args: [user],
          }),
        ]);

        // Also check direct LP token balance (unstaked)
        const lpBalance = await this.client.readContract({
          address: poolInfo.address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [user],
        });

        const totalLpBalance = stakedBalance + lpBalance;
        if (totalLpBalance === 0n) continue;

        // Get pool data to calculate value
        const [totalSupply, reserves] = await Promise.all([
          this.client.readContract({
            address: poolInfo.address,
            abi: erc20Abi,
            functionName: "totalSupply",
          }),
          this.client.readContract({
            address: poolInfo.address,
            abi: aerodromePoolAbi,
            functionName: "getReserves",
          }),
        ]);

        const [token0Addr, token1Addr] = await Promise.all([
          this.client.readContract({ address: poolInfo.address, abi: aerodromePoolAbi, functionName: "token0" }),
          this.client.readContract({ address: poolInfo.address, abi: aerodromePoolAbi, functionName: "token1" }),
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
          ? Number(totalLpBalance) / Number(totalSupply)
          : 0;

        const userAmount0 = reserve0 * userShare;
        const userAmount1 = reserve1 * userShare;
        const depositedUsd = userAmount0 * price0 + userAmount1 * price1;

        const aeroPrice = await priceService.getPrice("AERO");
        const earnedUsd = Number(formatUnits(earnedRewards, 18)) * aeroPrice;

        // Build a matching pool object
        const pool = await this.fetchSingleAerodromePool(poolInfo.address, poolInfo.name);
        if (!pool) continue;

        positions.push({
          pool,
          deposited: depositedUsd,
          earned: earnedUsd,
          tokens: [
            { symbol: token0Info.symbol, amount: userAmount0, valueUsd: userAmount0 * price0 },
            { symbol: token1Info.symbol, amount: userAmount1, valueUsd: userAmount1 * price1 },
          ],
        });
      } catch (err) {
        console.error(`[BaseAdapter] Error fetching Aerodrome position for ${poolInfo.name}:`, err);
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
      chainId: 8453,
      priceUsd: await priceService.getPrice(symbol),
    };
  }
}
