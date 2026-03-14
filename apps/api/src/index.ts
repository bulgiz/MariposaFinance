// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { PoolService } from "./pool-service.js";
import { registerPoolRoutes } from "./routes/pools.js";
import { registerSwapRoutes } from "./routes/swap.js";

const PORT = Number(process.env["API_PORT"] ?? 3001);
const HOST = process.env["API_HOST"] ?? "0.0.0.0";

async function main() {
  const app = Fastify({
    logger: {
      level: "info",
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    },
  });

  // CORS — allow frontend origins
  await app.register(cors, {
    origin: [
      "http://localhost:3000",
      "https://mariposa.finance",
      /^http:\/\/192\.168\.\d+\.\d+/,
    ],
    methods: ["GET", "POST"],
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // Health check
  app.get("/health", async () => ({ status: "ok", timestamp: Date.now() }));

  // Pool service and routes
  const poolService = new PoolService();
  registerPoolRoutes(app, poolService);

  // Swap routes (1inch proxy)
  registerSwapRoutes(app);

  // Start server
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`Mariposa API running at http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
