import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import {
  connection,
  deriveAgentStatePDA,
  deriveRegistryPDA,
  deriveAgentEntryPDA,
  PROGRAM_ID,
} from "../services/solana";
import { apiLimiter } from "../middleware/rateLimiter";
import { SEED_AGENTS } from "../data/seedAgents";

const router = Router();

/**
 * GET /agents?page=0&limit=20
 *
 * List agents from the on-chain registry.
 * Falls back to seed data when registry is not deployed.
 */
router.get("/", apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 0;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
    const offset = page * limit;

    // Try on-chain registry first
    const [registryPDA] = deriveRegistryPDA();
    const registryInfo = await connection.getAccountInfo(registryPDA);

    if (registryInfo) {
      // On-chain path: parse from registry
      const totalAgents = Number(registryInfo.data.readBigUInt64LE(40));
      const end = Math.min(offset + limit, totalAgents);
      const agents: any[] = [];

      for (let i = offset; i < end; i++) {
        const [entryPDA] = deriveAgentEntryPDA(registryPDA, i);
        const entryInfo = await connection.getAccountInfo(entryPDA);
        if (entryInfo) {
          agents.push({
            index: i,
            pda: entryPDA.toBase58(),
            dataLength: entryInfo.data.length,
          });
        }
      }

      res.json({ agents, total: totalAgents, page, limit });
      return;
    }

    // Fallback: return seed agents
    const total = SEED_AGENTS.length;
    const sliced = SEED_AGENTS.slice(offset, offset + limit);

    res.json({
      agents: sliced,
      total,
      page,
      limit,
      source: "seed",
    });
  } catch (err: any) {
    console.error("Error fetching agents:", err.message);
    // If RPC fails, still return seed data
    try {
      const page = parseInt(req.query.page as string, 10) || 0;
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
      const offset = page * limit;
      const sliced = SEED_AGENTS.slice(offset, offset + limit);
      res.json({
        agents: sliced,
        total: SEED_AGENTS.length,
        page,
        limit,
        source: "seed",
      });
    } catch {
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  }
});

/**
 * GET /agents/:mintOrSlug
 *
 * Get agent by mint address or slug name.
 * Falls back to seed data.
 */
router.get("/:mintOrSlug", apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const param = req.params.mintOrSlug;

    // Check if it's a slug (contains letters/hyphens, not base58 pubkey length)
    const seedBySlug = SEED_AGENTS.find(
      (a) => slugify(a.name) === param || a.id === param || a.mint === param
    );

    // Try as mint pubkey first
    let mintPubkey: PublicKey | null = null;
    try {
      mintPubkey = new PublicKey(param);
    } catch {
      // Not a valid pubkey — use slug lookup
    }

    if (mintPubkey) {
      const [agentStatePDA] = deriveAgentStatePDA(mintPubkey);
      const agentStateInfo = await connection.getAccountInfo(agentStatePDA);

      if (agentStateInfo) {
        res.json({
          mint: param,
          agentStatePDA: agentStatePDA.toBase58(),
          dataLength: agentStateInfo.data.length,
        });
        return;
      }
    }

    // Fallback: seed data lookup by slug, id, or mint
    if (seedBySlug) {
      res.json({ ...seedBySlug, source: "seed" });
      return;
    }

    res.status(404).json({ error: "Agent not found" });
  } catch (err: any) {
    // RPC error — try seed fallback
    const param = req.params.mintOrSlug;
    const seedBySlug = SEED_AGENTS.find(
      (a) => slugify(a.name) === param || a.id === param || a.mint === param
    );
    if (seedBySlug) {
      res.json({ ...seedBySlug, source: "seed" });
      return;
    }
    console.error("Error fetching agent:", err.message);
    res.status(500).json({ error: "Failed to fetch agent" });
  }
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default router;
