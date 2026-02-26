import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ChainId, Protocol, PoolFilters } from "@mariposa/core";
import type { PoolService } from "../pool-service.js";

const poolQuerySchema = z.object({
  chain: z.coerce.number().optional().transform((v) => v as ChainId | undefined),
  protocol: z.string().optional().transform((v) => v as Protocol | undefined),
  minApy: z.coerce.number().optional(),
  maxApy: z.coerce.number().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["apy", "tvl", "name"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export function registerPoolRoutes(
  app: FastifyInstance,
  poolService: PoolService
) {
  app.get("/pools", async (request, reply) => {
    try {
      const query = poolQuerySchema.parse(request.query);
      const filters: PoolFilters = {
        chain: query.chain,
        protocol: query.protocol,
        minApy: query.minApy,
        maxApy: query.maxApy,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
      };

      const { pools, total } = await poolService.getPools(filters);

      return reply.send({
        data: pools,
        meta: {
          total,
          limit: filters.limit ?? 50,
          offset: filters.offset ?? 0,
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Invalid query parameters",
          details: err.errors,
        });
      }
      throw err;
    }
  });

  app.get<{ Params: { id: string } }>("/pools/:id", async (request, reply) => {
    const pool = await poolService.getPoolById(request.params.id);
    if (!pool) {
      return reply.status(404).send({ error: "Pool not found" });
    }
    return reply.send({ data: pool });
  });

  app.get("/stats", async (_request, reply) => {
    const stats = await poolService.getStats();
    return reply.send({ data: stats });
  });

  app.get<{ Params: { address: string } }>(
    "/portfolio/:address",
    async (request, reply) => {
      const { address } = request.params;

      // Validate Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return reply.status(400).send({ error: "Invalid Ethereum address" });
      }

      // Phase 1: Return empty portfolio — positions require on-chain reads
      return reply.send({
        data: {
          address,
          positions: [],
          totalValue: 0,
          totalEarned: 0,
        },
      });
    }
  );
}
