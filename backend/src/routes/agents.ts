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

// ── Borsh deserialization helpers ──────────────────────────────────────────────

const AGENT_TYPE_NAMES = ["Assistant", "Oracle", "Trader", "Moderator", "Custom"];
const NEON_COLORS = ["#00e5ff", "#ff0090", "#7c4dff", "#ffea00", "#00e676", "#8B5CF6"];

function readBorshString(data: Buffer, offset: number): { value: string; newOffset: number } {
  const len = data.readUInt32LE(offset);
  const value = data.subarray(offset + 4, offset + 4 + len).toString("utf-8");
  return { value, newOffset: offset + 4 + len };
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Parse an on-chain AgentEntry account into a frontend-compatible Agent object.
 *
 * AgentEntry layout (after 8-byte discriminator):
 *   token_id: u64 (8)
 *   mint: Pubkey (32)
 *   agent_state: Pubkey (32)
 *   creator: Pubkey (32)
 *   agent_type: u8 (1)
 *   name: String (4 + len)
 *   backend_uri: String (4 + len)
 */
function parseAgentEntry(data: Buffer, index: number): any | null {
  try {
    let offset = 8; // skip discriminator

    const tokenId = Number(data.readBigUInt64LE(offset)); offset += 8;
    const mint = new PublicKey(data.subarray(offset, offset + 32)).toBase58(); offset += 32;
    const agentState = new PublicKey(data.subarray(offset, offset + 32)).toBase58(); offset += 32;
    const creator = new PublicKey(data.subarray(offset, offset + 32)).toBase58(); offset += 32;
    const agentType = data.readUInt8(offset); offset += 1;

    const nameResult = readBorshString(data, offset); offset = nameResult.newOffset;
    const name = nameResult.value;

    const uriResult = readBorshString(data, offset); offset = uriResult.newOffset;
    const backendUri = uriResult.value;

    // Generate deterministic display properties from index
    const seed = index * 137.5;
    const angle = seededRandom(seed) * Math.PI * 2;
    const dist = 8 + seededRandom(seed + 1) * 25;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = 8 + seededRandom(seed + 2) * 8;
    const color = NEON_COLORS[index % NEON_COLORS.length];
    const category = AGENT_TYPE_NAMES[agentType] || "Custom";
    const slug = slugify(name);

    return {
      id: `SAIA-${tokenId}`,
      mint,
      name,
      category,
      owner: creator.slice(0, 8),
      description: `${category} agent on SAIA578`,
      verified: false,
      kycLevel: 0,
      retired: false,
      createdAt: new Date().toISOString(),
      tags: [category.toLowerCase()],
      backendUri,
      logicContract: agentState,
      evolutions: 0,
      reputationScore: 80 + seededRandom(seed + 3) * 20,
      position: [x, y, z],
      color,
      avatar: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${slug}`,
      source: "on-chain",
    };
  } catch {
    return null;
  }
}

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
          const parsed = parseAgentEntry(entryInfo.data, i);
          if (parsed) {
            agents.push(parsed);
          }
        }
      }

      res.json({ agents, total: totalAgents, page, limit, source: "on-chain" });
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

    // Check seed data first by slug, id, or mint
    const seedBySlug = SEED_AGENTS.find(
      (a) => slugify(a.name) === param || a.id === param || a.mint === param
    );

    // Also check on-chain agents by slug
    const [registryPDA] = deriveRegistryPDA();
    const registryInfo = await connection.getAccountInfo(registryPDA);

    if (registryInfo) {
      const totalAgents = Number(registryInfo.data.readBigUInt64LE(40));

      // Search on-chain entries for a matching slug or mint
      for (let i = 0; i < totalAgents; i++) {
        const [entryPDA] = deriveAgentEntryPDA(registryPDA, i);
        const entryInfo = await connection.getAccountInfo(entryPDA);
        if (entryInfo) {
          const parsed = parseAgentEntry(entryInfo.data, i);
          if (parsed && (slugify(parsed.name) === param || parsed.mint === param)) {
            res.json(parsed);
            return;
          }
        }
      }
    }

    // Try as mint pubkey for direct on-chain lookup
    let mintPubkey: PublicKey | null = null;
    try {
      mintPubkey = new PublicKey(param);
    } catch {
      // Not a valid pubkey
    }

    if (mintPubkey) {
      const [agentStatePDA] = deriveAgentStatePDA(mintPubkey);
      const agentStateInfo = await connection.getAccountInfo(agentStatePDA);

      if (agentStateInfo) {
        // Return a minimal agent object with the mint
        const slug = param.slice(0, 8).toLowerCase();
        res.json({
          id: `SAIA-${param.slice(0, 8)}`,
          mint: param,
          name: `Agent ${param.slice(0, 6)}`,
          category: "Custom",
          owner: param.slice(0, 8),
          description: "On-chain agent",
          verified: false,
          kycLevel: 0,
          retired: false,
          createdAt: new Date().toISOString(),
          tags: [],
          backendUri: "",
          logicContract: agentStatePDA.toBase58(),
          evolutions: 0,
          reputationScore: 85,
          position: [0, 10, 0],
          color: "#00e5ff",
          avatar: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${slug}`,
          source: "on-chain",
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
