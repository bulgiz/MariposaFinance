import { SECONDS_PER_YEAR } from "@mariposa/core";

/**
 * Calculate base APY from trading fees.
 *
 * @param volume24h - 24-hour trading volume in USD
 * @param feeTier - Fee tier in basis points (e.g., 30 = 0.30%)
 * @param tvl - Total value locked in USD
 * @returns Annual percentage yield from trading fees
 */
export function calculateBaseApy(
  volume24h: number,
  feeTier: number,
  tvl: number
): number {
  if (tvl <= 0) return 0;
  const dailyFees = volume24h * (feeTier / 10_000);
  const dailyRate = dailyFees / tvl;
  // APY = (1 + dailyRate)^365 - 1, expressed as percentage
  return (Math.pow(1 + dailyRate, 365) - 1) * 100;
}

/**
 * Calculate reward APY from farming incentives.
 *
 * @param rewardRatePerSecond - Reward tokens emitted per second
 * @param rewardTokenPriceUsd - Price of reward token in USD
 * @param tvl - Total value locked in USD
 * @returns Annual percentage yield from farming rewards
 */
export function calculateRewardApy(
  rewardRatePerSecond: number,
  rewardTokenPriceUsd: number,
  tvl: number
): number {
  if (tvl <= 0) return 0;
  const annualRewardsUsd =
    rewardRatePerSecond * rewardTokenPriceUsd * SECONDS_PER_YEAR;
  return (annualRewardsUsd / tvl) * 100;
}

/**
 * Calculate compounded APY from a simple APR.
 *
 * @param apr - Annual percentage rate (as percentage, e.g. 10 = 10%)
 * @param compoundsPerYear - Number of compounding periods per year
 * @returns Compounded annual percentage yield
 */
export function calculateCompoundedApy(
  apr: number,
  compoundsPerYear: number = 365
): number {
  if (compoundsPerYear <= 0) return apr;
  const rateDecimal = apr / 100;
  return (
    (Math.pow(1 + rateDecimal / compoundsPerYear, compoundsPerYear) - 1) * 100
  );
}

/**
 * Calculate lending APY from Aave-style supply rate.
 *
 * @param supplyRatePerSecond - Supply rate per second in RAY (1e27)
 * @returns Annual percentage yield for lending
 */
export function calculateLendingApy(supplyRatePerSecond: bigint): number {
  const RAY = 10n ** 27n;
  // Convert to a float-friendly number
  const ratePerSecond = Number(supplyRatePerSecond) / Number(RAY);
  // APY = (1 + rate/seconds)^seconds - 1
  return (Math.pow(1 + ratePerSecond, SECONDS_PER_YEAR) - 1) * 100;
}

/**
 * Calculate net APY after Mariposa performance fee.
 *
 * @param grossApy - Gross APY before fees
 * @param performanceFeeBps - Performance fee in basis points (e.g., 450 = 4.5%)
 * @returns Net APY after fees
 */
export function calculateNetApy(
  grossApy: number,
  performanceFeeBps: number
): number {
  return grossApy * (1 - performanceFeeBps / 10_000);
}

/**
 * Estimate daily earnings from a deposit.
 *
 * @param depositUsd - Deposit amount in USD
 * @param apy - Annual percentage yield
 * @returns Estimated daily earnings in USD
 */
export function estimateDailyEarnings(
  depositUsd: number,
  apy: number
): number {
  const dailyRate = Math.pow(1 + apy / 100, 1 / 365) - 1;
  return depositUsd * dailyRate;
}
