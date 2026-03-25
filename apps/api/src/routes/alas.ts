// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import pg from "pg";
import crypto from "crypto";

const { Pool } = pg;

const DB_URL = process.env["POSTGRES_URL"];
if (!DB_URL) throw new Error("POSTGRES_URL environment variable is required");

let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: DB_URL });
    _pool.on("error", (err) => console.error("Postgres pool error:", err));
  }
  return _pool;
}

// ─── Points Config ───────────────────────────────────────────────

const POINTS = {
  FIRST_CONNECT: 100,
  DAILY_CHECKIN: 10,
  STREAK_BONUS_PER_DAY: 2,
  STREAK_BONUS_CAP: 20,
  VIEW_POOL: 5,
  CONNECT_PORTFOLIO: 25,
  REFERRAL_BONUS: 200,
  REFERRED_BONUS: 50,
  SOCIAL_SHARE: 15,
} as const;

type AlasAction =
  | "first_connect"
  | "daily_checkin"
  | "view_pool"
  | "connect_portfolio"
  | "social_share"
  | "referral_signup"
  | "referred_bonus";

// ─── Helpers ─────────────────────────────────────────────────────

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "MFY-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Lightweight EIP-191 signature verification using secp256k1
// We use Node.js crypto for signature recovery instead of importing viem
async function verifyEip191(address: string, message: string, signature: string): Promise<boolean> {
  try {
    // Import viem dynamically to avoid bundling issues
    const { verifyMessage } = await import("viem");
    return await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

async function getOrCreateUser(
  db: pg.Pool,
  walletAddress: string,
  referralCode?: string
): Promise<{ isNew: boolean; wallet_address: string; referral_code: string; total_alas: number; referred_by: string | null }> {
  const addr = walletAddress.toLowerCase();

  const existing = await db.query<{ wallet_address: string; referral_code: string; total_alas: number; referred_by: string | null }>(
    "SELECT wallet_address, referral_code, total_alas, referred_by FROM alas_users WHERE wallet_address = $1",
    [addr]
  );
  if (existing.rows[0]) {
    return { isNew: false, ...existing.rows[0] };
  }

  // Generate unique referral code
  let code = generateReferralCode();
  for (let i = 0; i < 10; i++) {
    const exists = await db.query("SELECT 1 FROM alas_users WHERE referral_code = $1", [code]);
    if (!exists.rows[0]) break;
    code = generateReferralCode();
  }

  let referredBy: string | null = null;
  if (referralCode) {
    const ref = await db.query<{ referral_code: string }>(
      "SELECT referral_code FROM alas_users WHERE referral_code = $1",
      [referralCode.toUpperCase()]
    );
    if (ref.rows[0]) referredBy = ref.rows[0].referral_code;
  }

  const result = await db.query<{ wallet_address: string; referral_code: string; total_alas: number; referred_by: string | null }>(
    "INSERT INTO alas_users (wallet_address, referral_code, referred_by, total_alas) VALUES ($1, $2, $3, 0) RETURNING wallet_address, referral_code, total_alas, referred_by",
    [addr, code, referredBy]
  );
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { isNew: true, ...result.rows[0]! };
}

async function addPoints(
  db: pg.Pool,
  walletAddress: string,
  action: AlasAction,
  points: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  const addr = walletAddress.toLowerCase();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO alas_events (wallet_address, action, points_earned, metadata) VALUES ($1, $2, $3, $4)",
      [addr, action, points, metadata ? JSON.stringify(metadata) : null]
    );
    await client.query(
      "UPDATE alas_users SET total_alas = total_alas + $1, updated_at = NOW() WHERE wallet_address = $2",
      [points, addr]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function hasAction(db: pg.Pool, walletAddress: string, action: AlasAction): Promise<boolean> {
  const r = await db.query("SELECT 1 FROM alas_events WHERE wallet_address = $1 AND action = $2 LIMIT 1", [walletAddress.toLowerCase(), action]);
  return (r.rowCount ?? 0) > 0;
}

async function hasActionToday(db: pg.Pool, walletAddress: string, action: AlasAction): Promise<boolean> {
  const r = await db.query(
    "SELECT 1 FROM alas_events WHERE wallet_address = $1 AND action = $2 AND created_at > NOW() - INTERVAL '24 hours' LIMIT 1",
    [walletAddress.toLowerCase(), action]
  );
  return (r.rowCount ?? 0) > 0;
}

async function getSessionWallet(db: pg.Pool, token: string): Promise<string | null> {
  const r = await db.query<{ wallet_address: string }>(
    "SELECT wallet_address FROM alas_sessions WHERE token = $1 AND expires_at > NOW()",
    [token]
  );
  return r.rows[0]?.wallet_address ?? null;
}

// ─── Route Registration ──────────────────────────────────────────

export function registerAlasRoutes(app: FastifyInstance) {
  const db = getPool();

  // GET /alas/nonce/:address
  app.get("/alas/nonce/:address", async (request, reply) => {
    const { address } = request.params as { address: string };
    if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return reply.status(400).send({ error: "Invalid address" });
    }
    const nonce = crypto.randomBytes(16).toString("hex");
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `Mariposa Finance — Alas Points\nWallet: ${address}\nNonce: ${nonce}\nTimestamp: ${timestamp}\n\nSign to connect and earn Alas points.`;
    return reply.send({ message, nonce, timestamp });
  });

  // POST /alas/register
  app.post("/alas/register", async (request, reply) => {
    const schema = z.object({
      walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
      signature: z.string().min(1),
      message: z.string().min(1),
      referralCode: z.string().optional(),
    });
    let body: z.infer<typeof schema>;
    try { body = schema.parse(request.body); }
    catch (err) { return reply.status(400).send({ error: "Invalid request", details: err }); }

    const sigValid = await verifyEip191(body.walletAddress, body.message, body.signature);
    if (!sigValid) {
      return reply.status(401).send({ error: "Invalid wallet signature" });
    }

    const user = await getOrCreateUser(db, body.walletAddress, body.referralCode);
    let pointsEarned = 0;

    if (user.isNew) {
      await addPoints(db, body.walletAddress, "first_connect", POINTS.FIRST_CONNECT);
      pointsEarned += POINTS.FIRST_CONNECT;

      if (user.referred_by) {
        const referrer = await db.query<{ wallet_address: string }>(
          "SELECT wallet_address FROM alas_users WHERE referral_code = $1",
          [user.referred_by]
        );
        if (referrer.rows[0]) {
          await addPoints(db, referrer.rows[0].wallet_address, "referral_signup", POINTS.REFERRAL_BONUS, {
            referred_wallet: body.walletAddress,
          });
        }
        await addPoints(db, body.walletAddress, "referred_bonus", POINTS.REFERRED_BONUS, { referred_by: user.referred_by });
        pointsEarned += POINTS.REFERRED_BONUS;
      }
    }

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.query(
      "INSERT INTO alas_sessions (token, wallet_address, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO NOTHING",
      [token, body.walletAddress.toLowerCase(), expiresAt]
    );

    const fresh = await db.query<{ wallet_address: string; referral_code: string; total_alas: number; referred_by: string | null }>(
      "SELECT wallet_address, referral_code, total_alas, referred_by FROM alas_users WHERE wallet_address = $1",
      [body.walletAddress.toLowerCase()]
    );

    return reply.send({ user: fresh.rows[0], sessionToken: token, isNew: user.isNew, pointsEarned });
  });

  // POST /alas/checkin
  app.post("/alas/checkin", async (request, reply) => {
    const schema = z.object({ sessionToken: z.string().length(64) });
    let body: z.infer<typeof schema>;
    try { body = schema.parse(request.body); }
    catch { return reply.status(400).send({ error: "Invalid request" }); }

    const walletAddress = await getSessionWallet(db, body.sessionToken);
    if (!walletAddress) return reply.status(401).send({ error: "Invalid or expired session" });

    const today = new Date().toISOString().split("T")[0] as string;
    const dup = await db.query("SELECT 1 FROM daily_checkins WHERE wallet_address = $1 AND date = $2", [walletAddress, today]);
    if ((dup.rowCount ?? 0) > 0) return reply.status(409).send({ error: "Already checked in today", alreadyClaimed: true });

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0] as string;
    const prev = await db.query<{ streak_count: number }>(
      "SELECT streak_count FROM daily_checkins WHERE wallet_address = $1 AND date = $2",
      [walletAddress, yesterday]
    );
    const streak = (prev.rows[0]?.streak_count ?? 0) + 1;
    const streakBonus = Math.min((streak - 1) * POINTS.STREAK_BONUS_PER_DAY, POINTS.STREAK_BONUS_CAP);
    const totalPoints = POINTS.DAILY_CHECKIN + streakBonus;

    await db.query(
      "INSERT INTO daily_checkins (wallet_address, date, streak_count, points_earned) VALUES ($1, $2, $3, $4)",
      [walletAddress, today, streak, totalPoints]
    );
    await addPoints(db, walletAddress, "daily_checkin", totalPoints, { streak, date: today });

    const fresh = await db.query<{ total_alas: number }>("SELECT total_alas FROM alas_users WHERE wallet_address = $1", [walletAddress]);
    return reply.send({ pointsEarned: totalPoints, streak, streakBonus, newTotal: fresh.rows[0]?.total_alas ?? 0 });
  });

  // POST /alas/action
  app.post("/alas/action", async (request, reply) => {
    const schema = z.object({
      sessionToken: z.string().length(64),
      action: z.enum(["view_pool", "connect_portfolio", "social_share"]),
      metadata: z.record(z.unknown()).optional(),
    });
    let body: z.infer<typeof schema>;
    try { body = schema.parse(request.body); }
    catch { return reply.status(400).send({ error: "Invalid request" }); }

    const walletAddress = await getSessionWallet(db, body.sessionToken);
    if (!walletAddress) return reply.status(401).send({ error: "Invalid or expired session" });

    if (body.action === "connect_portfolio") {
      if (await hasAction(db, walletAddress, "connect_portfolio")) return reply.send({ pointsEarned: 0, alreadyClaimed: true });
      await addPoints(db, walletAddress, "connect_portfolio", POINTS.CONNECT_PORTFOLIO, body.metadata);
      return reply.send({ pointsEarned: POINTS.CONNECT_PORTFOLIO });
    }

    if (await hasActionToday(db, walletAddress, body.action)) return reply.send({ pointsEarned: 0, alreadyClaimed: true });
    const pts = body.action === "view_pool" ? POINTS.VIEW_POOL : POINTS.SOCIAL_SHARE;
    await addPoints(db, walletAddress, body.action, pts, body.metadata);
    return reply.send({ pointsEarned: pts });
  });

  // GET /alas/profile/:address
  app.get("/alas/profile/:address", async (request, reply) => {
    const { address } = request.params as { address: string };
    if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) return reply.status(400).send({ error: "Invalid address" });
    const addr = address.toLowerCase();

    const user = await db.query<{ wallet_address: string; referral_code: string; total_alas: number; referred_by: string | null; created_at: string }>(
      "SELECT wallet_address, referral_code, total_alas, referred_by, created_at FROM alas_users WHERE wallet_address = $1",
      [addr]
    );
    if (!user.rows[0]) return reply.status(404).send({ error: "User not found" });

    const rank = await db.query<{ rank: string }>(
      "SELECT COUNT(*) + 1 AS rank FROM alas_users WHERE total_alas > (SELECT total_alas FROM alas_users WHERE wallet_address = $1)",
      [addr]
    );

    const today = new Date().toISOString().split("T")[0] as string;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0] as string;
    const streak = await db.query<{ streak_count: number; date: string }>(
      "SELECT streak_count, date FROM daily_checkins WHERE wallet_address = $1 AND (date = $2 OR date = $3) ORDER BY date DESC LIMIT 1",
      [addr, today, yesterday]
    );
    const checkedToday = await db.query(
      "SELECT 1 FROM daily_checkins WHERE wallet_address = $1 AND date = $2",
      [addr, today]
    );
    const events = await db.query<{ action: string; points_earned: number; metadata: unknown; created_at: string }>(
      "SELECT action, points_earned, metadata, created_at FROM alas_events WHERE wallet_address = $1 ORDER BY created_at DESC LIMIT 10",
      [addr]
    );

    return reply.send({
      ...user.rows[0],
      rank: Number(rank.rows[0]?.rank ?? 1),
      streak: streak.rows[0]?.streak_count ?? 0,
      checkedInToday: (checkedToday.rowCount ?? 0) > 0,
      recentEvents: events.rows,
    });
  });

  // GET /alas/leaderboard
  app.get("/alas/leaderboard", async (request, reply) => {
    const schema = z.object({
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
      viewer: z.string().optional(),
    });
    const query = schema.parse(request.query);

    const rows = await db.query<{ wallet_address: string; referral_code: string; total_alas: number; rank: string }>(
      `SELECT wallet_address, referral_code, total_alas,
              ROW_NUMBER() OVER (ORDER BY total_alas DESC) AS rank
       FROM alas_users ORDER BY total_alas DESC LIMIT $1 OFFSET $2`,
      [query.limit, query.offset]
    );

    const total = await db.query<{ count: string }>("SELECT COUNT(*) FROM alas_users");

    let viewerRank = null;
    if (query.viewer && /^0x[a-fA-F0-9]{40}$/i.test(query.viewer)) {
      const vr = await db.query<{ rank: string; total_alas: number }>(
        "SELECT (SELECT COUNT(*) + 1 FROM alas_users WHERE total_alas > u.total_alas) AS rank, u.total_alas FROM alas_users u WHERE u.wallet_address = $1",
        [query.viewer.toLowerCase()]
      );
      if (vr.rows[0]) viewerRank = { rank: Number(vr.rows[0].rank), total_alas: vr.rows[0].total_alas };
    }

    return reply.send({
      leaderboard: rows.rows.map(r => ({ ...r, rank: Number(r.rank) })),
      total: Number(total.rows[0]?.count ?? 0),
      viewerRank,
    });
  });
}
