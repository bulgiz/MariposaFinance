import { describe, it, expect } from "vitest";
import {
  calculateBaseApy,
  calculateRewardApy,
  calculateCompoundedApy,
  calculateLendingApy,
  calculateNetApy,
  estimateDailyEarnings,
} from "./calculator.js";

describe("calculateBaseApy", () => {
  it("returns 0 when TVL is 0", () => {
    expect(calculateBaseApy(100_000, 30, 0)).toBe(0);
  });

  it("returns 0 when TVL is negative", () => {
    expect(calculateBaseApy(100_000, 30, -1)).toBe(0);
  });

  it("calculates APY from trading fees correctly", () => {
    // $1M volume, 0.30% fee, $10M TVL
    // Daily fees = $1M * 0.003 = $3000
    // Daily rate = $3000 / $10M = 0.0003
    // APY = (1.0003^365 - 1) * 100 ≈ 11.6%
    const apy = calculateBaseApy(1_000_000, 30, 10_000_000);
    expect(apy).toBeGreaterThan(10);
    expect(apy).toBeLessThan(13);
  });

  it("higher fees produce higher APY", () => {
    const lowFee = calculateBaseApy(1_000_000, 5, 10_000_000);
    const highFee = calculateBaseApy(1_000_000, 30, 10_000_000);
    expect(highFee).toBeGreaterThan(lowFee);
  });
});

describe("calculateRewardApy", () => {
  it("returns 0 when TVL is 0", () => {
    expect(calculateRewardApy(1, 2, 0)).toBe(0);
  });

  it("calculates reward APY from emission rate", () => {
    // 1 token/sec at $2/token, $1M TVL
    // Annual rewards = 1 * 2 * 31557600 = $63,115,200
    // APY = ($63.1M / $1M) * 100 = 6311.52%
    const apy = calculateRewardApy(1, 2, 1_000_000);
    expect(apy).toBeGreaterThan(6000);
    expect(apy).toBeLessThan(7000);
  });
});

describe("calculateCompoundedApy", () => {
  it("returns APR when compounds per year is 0", () => {
    expect(calculateCompoundedApy(10, 0)).toBe(10);
  });

  it("daily compounding produces higher APY than APR", () => {
    const apy = calculateCompoundedApy(10, 365);
    expect(apy).toBeGreaterThan(10);
    // 10% APR compounded daily ≈ 10.52% APY
    expect(apy).toBeCloseTo(10.52, 1);
  });

  it("more frequent compounding yields higher APY", () => {
    const monthly = calculateCompoundedApy(10, 12);
    const daily = calculateCompoundedApy(10, 365);
    expect(daily).toBeGreaterThan(monthly);
  });
});

describe("calculateLendingApy", () => {
  it("returns close to 0 for zero rate", () => {
    const apy = calculateLendingApy(0n);
    expect(apy).toBeCloseTo(0, 5);
  });

  it("returns a realistic APY for a typical Aave rate", () => {
    // A typical Aave liquidity rate might be ~3% APY
    // In RAY (1e27), the per-second rate for ~3% APR is approximately:
    // 0.03 / 31557600 * 1e27 ≈ 9.5e17
    const rateRay = BigInt("950000000000000000"); // ~3% APY
    const apy = calculateLendingApy(rateRay);
    expect(apy).toBeGreaterThan(2);
    expect(apy).toBeLessThan(5);
  });
});

describe("calculateNetApy", () => {
  it("reduces APY by the performance fee", () => {
    // 10% APY with 4.5% performance fee (450 bps)
    const netApy = calculateNetApy(10, 450);
    expect(netApy).toBeCloseTo(9.55);
  });

  it("returns full APY with zero fee", () => {
    expect(calculateNetApy(10, 0)).toBe(10);
  });
});

describe("estimateDailyEarnings", () => {
  it("estimates daily earnings from deposit and APY", () => {
    // $10,000 deposit at 10% APY
    const daily = estimateDailyEarnings(10_000, 10);
    // Should be roughly $10000 * (1.10^(1/365) - 1) ≈ $2.61/day
    expect(daily).toBeGreaterThan(2.5);
    expect(daily).toBeLessThan(2.7);
  });

  it("returns 0 for zero deposit", () => {
    expect(estimateDailyEarnings(0, 10)).toBe(0);
  });
});
