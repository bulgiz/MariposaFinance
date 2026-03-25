// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://mariposa.finance/api";

export interface AlasUser {
  wallet_address: string;
  referral_code: string;
  total_alas: number;
  referred_by: string | null;
  rank?: number;
  streak?: number;
  checkedInToday?: boolean;
  recentEvents?: AlasEvent[];
  created_at?: string;
}

export interface AlasEvent {
  action: string;
  points_earned: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface LeaderboardEntry {
  wallet_address: string;
  referral_code: string;
  total_alas: number;
  rank: number;
}

export async function fetchNonce(address: string): Promise<{ message: string; nonce: string; timestamp: number }> {
  const res = await fetch(`${API_BASE}/alas/nonce/${address}`);
  if (!res.ok) throw new Error("Failed to fetch nonce");
  return res.json();
}

export async function registerWallet(
  walletAddress: string,
  signature: string,
  message: string,
  referralCode?: string
): Promise<{ user: AlasUser; sessionToken: string; isNew: boolean; pointsEarned: number }> {
  const res = await fetch(`${API_BASE}/alas/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, signature, message, referralCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Registration failed");
  }
  return res.json();
}

export async function dailyCheckin(sessionToken: string): Promise<{
  pointsEarned: number;
  streak: number;
  streakBonus: number;
  newTotal: number;
  alreadyClaimed?: boolean;
}> {
  const res = await fetch(`${API_BASE}/alas/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken }),
  });
  if (res.status === 409) return { ...(await res.json()), alreadyClaimed: true } as ReturnType<typeof dailyCheckin> extends Promise<infer T> ? T : never;
  if (!res.ok) throw new Error("Check-in failed");
  return res.json();
}

export async function recordAction(
  sessionToken: string,
  action: "view_pool" | "connect_portfolio" | "social_share",
  metadata?: Record<string, unknown>
): Promise<{ pointsEarned: number; alreadyClaimed?: boolean }> {
  const res = await fetch(`${API_BASE}/alas/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken, action, metadata }),
  });
  if (!res.ok) return { pointsEarned: 0 };
  return res.json();
}

export async function fetchProfile(address: string): Promise<AlasUser> {
  const res = await fetch(`${API_BASE}/alas/profile/${address}`);
  if (!res.ok) throw new Error("Profile not found");
  return res.json();
}

export async function fetchLeaderboard(
  limit = 50,
  offset = 0,
  viewer?: string
): Promise<{ leaderboard: LeaderboardEntry[]; total: number; viewerRank: { rank: number; total_alas: number } | null }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (viewer) params.set("viewer", viewer);
  const res = await fetch(`${API_BASE}/alas/leaderboard?${params}`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}

// Session management
const SESSION_KEY = "mariposa_alas_session";

export function saveSession(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(SESSION_KEY, token);
}

export function getSession(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function clearSession() {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
}

// Referral code from URL
export function saveReferralCode(code: string) {
  if (typeof window !== "undefined") localStorage.setItem("mariposa_ref", code);
}

export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mariposa_ref");
}
