// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  fetchNonce, registerWallet, dailyCheckin, recordAction,
  fetchProfile, fetchLeaderboard,
  saveSession, getSession, clearSession,
  getStoredReferralCode, saveReferralCode,
  type AlasUser, type LeaderboardEntry,
} from "@/lib/alas-api";

const ACTION_LABELS: Record<string, string> = {
  first_connect: "First wallet connection",
  daily_checkin: "Daily check-in",
  view_pool: "Viewed a pool",
  connect_portfolio: "Connected portfolio",
  referral_signup: "Referral bonus",
  referred_bonus: "Referred by friend",
  social_share: "Shared on Twitter",
};

const POINTS_TABLE = [
  { action: "First wallet connect", points: 100, frequency: "One-time" },
  { action: "Daily check-in", points: 10, frequency: "Daily" },
  { action: "Streak bonus", points: "+2/day (cap 20)", frequency: "Daily" },
  { action: "View a pool", points: 5, frequency: "Once/day" },
  { action: "Connect portfolio", points: 25, frequency: "One-time" },
  { action: "Refer a friend", points: 200, frequency: "Per referral" },
  { action: "Referred by friend", points: 50, frequency: "One-time" },
  { action: "Share on Twitter", points: 15, frequency: "Once/day" },
];

export default function AlasPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [profile, setProfile] = useState<AlasUser | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardTotal, setLeaderboardTotal] = useState(0);
  const [viewerRank, setViewerRank] = useState<{ rank: number; total_alas: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"overview" | "leaderboard" | "earn">("overview");

  // Read ref param from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) saveReferralCode(ref);
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const data = await fetchLeaderboard(50, 0, address);
      setLeaderboard(data.leaderboard);
      setLeaderboardTotal(data.total);
      setViewerRank(data.viewerRank);
    } catch {
      // silent
    }
  }, [address]);

  const loadProfile = useCallback(async (addr: string) => {
    try {
      const p = await fetchProfile(addr);
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  // Load profile + leaderboard when wallet connects
  useEffect(() => {
    if (!isConnected || !address) {
      setProfile(null);
      return;
    }
    loadProfile(address);
    loadLeaderboard();
  }, [isConnected, address, loadProfile, loadLeaderboard]);

  async function handleConnect() {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const { message } = await fetchNonce(address);
      const signature = await signMessageAsync({ message });
      const refCode = getStoredReferralCode() ?? undefined;
      const result = await registerWallet(address, signature, message, refCode);
      saveSession(result.sessionToken);
      if (result.pointsEarned > 0) setLastPoints(result.pointsEarned);
      await loadProfile(address);
      await loadLeaderboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckin() {
    const token = getSession();
    if (!token) { setError("Please sign in first"); return; }
    setCheckinLoading(true);
    setError(null);
    try {
      const result = await dailyCheckin(token);
      if (result.alreadyClaimed) {
        setError("Already checked in today. Come back tomorrow!");
      } else {
        setLastPoints(result.pointsEarned);
        if (address) await loadProfile(address);
        await loadLeaderboard();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setCheckinLoading(false);
    }
  }

  async function handleShareTwitter() {
    const token = getSession();
    if (!token || !profile) return;
    const text = encodeURIComponent(
      `I'm earning Alas points on @MariposaFinance — the multi-chain DeFi yield aggregator! 🦋\n\nJoin via my referral link and earn 50 bonus Alas:\nhttps://mariposa.finance?ref=${profile.referral_code}\n\n#DeFi #Mariposa #Alas`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
    const result = await recordAction(token, "social_share");
    if (result.pointsEarned > 0) {
      setLastPoints(result.pointsEarned);
      if (address) await loadProfile(address);
    }
  }

  function copyReferralLink() {
    if (!profile) return;
    navigator.clipboard.writeText(`https://mariposa.finance?ref=${profile.referral_code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isSignedIn = !!getSession() && !!profile;
  const referralLink = profile ? `https://mariposa.finance?ref=${profile.referral_code}` : "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🦋</div>
        <h1 className="text-4xl font-bold mb-3">Earn Your Wings</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Collect Alas points before <strong className="text-primary">$CAPULLO</strong> takes flight.
          Points convert to tokens at a fixed ratio on launch.
        </p>
      </div>

      {/* Connect prompt */}
      {!isConnected && (
        <div className="rounded-xl border border-border bg-card p-10 text-center mb-10">
          <p className="text-muted-foreground mb-6">Connect your wallet to start earning Alas points</p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      )}

      {/* Signed-in dashboard */}
      {isConnected && (
        <>
          {/* Balance card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="sm:col-span-2 rounded-xl border border-primary/30 bg-primary/5 p-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Your Alas Balance</p>
                  <div className="text-5xl font-bold text-primary">
                    {profile?.total_alas ?? 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Alas Points</p>
                </div>
                <div className="text-right">
                  {profile?.rank && (
                    <div className="text-2xl font-bold">#{profile.rank}</div>
                  )}
                  <p className="text-sm text-muted-foreground">Rank</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground mb-1">Streak</p>
              <div className="text-4xl font-bold mb-1">
                {profile?.streak ?? 0} {(profile?.streak ?? 0) >= 3 ? "🔥" : ""}
              </div>
              <p className="text-sm text-muted-foreground">
                {profile?.checkedInToday ? "Checked in today ✓" : "Check in today!"}
              </p>
            </div>
          </div>

          {/* Sign-in / Check-in */}
          {!isSignedIn ? (
            <div className="rounded-xl border border-border bg-card p-6 mb-8 text-center">
              <p className="text-muted-foreground mb-4">
                Sign a message with your wallet to earn points and check in daily.
              </p>
              {error && <p className="text-destructive text-sm mb-3">{error}</p>}
              <button
                onClick={handleConnect}
                disabled={loading}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? "Signing..." : "Sign In & Earn 100 Alas"}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold mb-1">Daily Check-in</h3>
                  <p className="text-sm text-muted-foreground">
                    Earn 10+ Alas points. Build your streak for bonus points!
                  </p>
                  {profile?.streak && profile.streak >= 2 && (
                    <p className="text-sm text-primary mt-1">
                      Day {profile.streak} streak — {Math.min((profile.streak - 1) * 2, 20)} bonus points/day
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2">
                  {error && <p className="text-destructive text-xs">{error}</p>}
                  {lastPoints !== null && lastPoints > 0 && (
                    <p className="text-emerald-500 text-sm font-medium">+{lastPoints} Alas earned!</p>
                  )}
                  <button
                    onClick={handleCheckin}
                    disabled={checkinLoading || profile?.checkedInToday}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {checkinLoading
                      ? "Claiming..."
                      : profile?.checkedInToday
                      ? "Claimed Today ✓"
                      : "Claim Daily Alas"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-muted/30 rounded-lg p-1 w-fit">
            {(["overview", "leaderboard", "earn"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                  tab === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "earn" ? "How to Earn" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Referral */}
              {profile && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-3">Your Referral Link</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Earn <strong className="text-primary">200 Alas</strong> for each friend you refer.
                    Your friend gets <strong className="text-primary">50 bonus Alas</strong> too.
                  </p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={referralLink}
                      className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm font-mono"
                    />
                    <button
                      onClick={copyReferralLink}
                      className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-lg text-sm hover:bg-primary/20 transition-colors whitespace-nowrap"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={handleShareTwitter}
                      className="bg-sky-500/10 text-sky-500 border border-sky-500/20 px-4 py-2 rounded-lg text-sm hover:bg-sky-500/20 transition-colors"
                    >
                      Share X
                    </button>
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {profile?.recentEvents && profile.recentEvents.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-4">Recent Activity</h3>
                  <div className="space-y-2">
                    {profile.recentEvents.map((event, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <span className="text-sm text-muted-foreground">
                          {ACTION_LABELS[event.action] ?? event.action}
                        </span>
                        <span className="text-sm font-medium text-emerald-500">
                          +{event.points_earned} Alas
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard Tab */}
          {tab === "leaderboard" && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">Top Alas Holders</h3>
                <span className="text-sm text-muted-foreground">{leaderboardTotal} wallets</span>
              </div>
              {viewerRank && (
                <div className="p-3 bg-primary/5 border-b border-primary/20 text-sm text-center">
                  Your rank: <strong className="text-primary">#{viewerRank.rank}</strong> with {viewerRank.total_alas} Alas
                </div>
              )}
              <div className="divide-y divide-border">
                {leaderboard.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No users yet. Be the first!</p>
                ) : (
                  leaderboard.map((entry) => {
                    const isViewer = entry.wallet_address === address?.toLowerCase();
                    return (
                      <div
                        key={entry.wallet_address}
                        className={`flex items-center justify-between px-4 py-3 ${isViewer ? "bg-primary/5" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-mono w-8 ${Number(entry.rank) <= 3 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                            #{entry.rank}
                          </span>
                          <span className="text-sm font-mono">
                            {entry.wallet_address.slice(0, 6)}...{entry.wallet_address.slice(-4)}
                            {isViewer && <span className="text-primary ml-2 text-xs">(you)</span>}
                          </span>
                        </div>
                        <span className="text-sm font-medium">{entry.total_alas} Alas</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* How to Earn Tab */}
          {tab === "earn" && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">How to Earn Alas Points</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Points</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Frequency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {POINTS_TABLE.map((row) => (
                    <tr key={row.action}>
                      <td className="px-4 py-3">{row.action}</td>
                      <td className="px-4 py-3 text-right font-medium text-primary">{row.points}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{row.frequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 border-t border-border bg-muted/10">
                <p className="text-xs text-muted-foreground">
                  All Alas points will convert to <strong>$CAPULLO</strong> tokens at a fixed ratio when the governance token launches.
                  Points are non-transferable.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Non-connected leaderboard teaser */}
      {!isConnected && leaderboard.length === 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4 text-center">How to Earn Alas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {POINTS_TABLE.slice(0, 4).map((row) => (
              <div key={row.action} className="rounded-xl border border-border bg-card p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">{row.points}</div>
                <div className="text-xs text-muted-foreground">{row.action}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
