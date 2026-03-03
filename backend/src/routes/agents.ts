import { Router, Request, Response } from "express";
import prisma from "../services/db";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

const NEON_COLORS = ["#00e5ff", "#ff0090", "#7c4dff", "#ffea00", "#00e676", "#8B5CF6"];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generatePosition(index: number): [number, number, number] {
  const seed = index * 137.5;
  const angle = seededRandom(seed) * Math.PI * 2;
  const dist = 8 + seededRandom(seed + 1) * 25;
  return [
    parseFloat((Math.cos(angle) * dist).toFixed(2)),
    parseFloat((8 + seededRandom(seed + 2) * 8).toFixed(2)),
    parseFloat((Math.sin(angle) * dist).toFixed(2)),
  ];
}

function formatAgent(agent: any) {
  const pos = agent.position as [number, number, number];
  return {
    id: agent.id,
    mint: agent.mint || `SAIA-${agent.id.slice(0, 8)}`,
    name: agent.name,
    slug: agent.slug,
    category: agent.category,
    owner: agent.ownerWallet.slice(0, 8),
    description: agent.description,
    verified: agent.verified,
    kycLevel: agent.kycLevel,
    retired: agent.retired,
    createdAt: agent.createdAt.toISOString(),
    tags: agent.tags as string[],
    backendUri: agent.backendUri,
    logicContract: "",
    evolutions: agent.evolutions,
    reputationScore: agent.reputationScore,
    position: Array.isArray(pos) ? pos : [0, 10, 0],
    color: agent.color,
    avatar: agent.avatar || `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${agent.slug}`,
    source: "database",
  };
}

// GET /agents?page=0&limit=20
router.get("/", apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 0;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        skip: page * limit,
        take: limit,
        orderBy: { createdAt: "asc" },
      }),
      prisma.agent.count(),
    ]);

    res.json({
      agents: agents.map(formatAgent),
      total,
      page,
      limit,
      source: "database",
    });
  } catch (err: any) {
    console.error("Error fetching agents:", err.message);
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});

// GET /agents/:slugOrId
router.get("/:slugOrId", apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const param = req.params.slugOrId;
    const agent = await prisma.agent.findFirst({
      where: {
        OR: [
          { slug: param },
          { id: param },
          { mint: param },
        ],
      },
    });

    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    res.json(formatAgent(agent));
  } catch (err: any) {
    console.error("Error fetching agent:", err.message);
    res.status(500).json({ error: "Failed to fetch agent" });
  }
});

// POST /agents — Create a new agent
router.post("/", apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, description, tags, wallet, backendUri } = req.body;

    if (!name?.trim() || !wallet?.trim()) {
      res.status(400).json({ error: "name and wallet are required" });
      return;
    }

    const slug = slugify(name.trim());

    const existing = await prisma.agent.findUnique({ where: { slug } });
    if (existing) {
      res.status(409).json({ error: "An agent with this name already exists" });
      return;
    }

    // Upsert user
    await prisma.user.upsert({
      where: { wallet },
      update: { lastSeen: new Date() },
      create: { wallet },
    });

    const count = await prisma.agent.count();
    const position = generatePosition(count);
    const color = NEON_COLORS[count % NEON_COLORS.length];

    const agent = await prisma.agent.create({
      data: {
        name: name.trim(),
        slug,
        category: category || "Custom",
        ownerWallet: wallet,
        description: description || `${category || "Custom"} agent on SAIA578`,
        tags: tags || [],
        backendUri: backendUri || "",
        position,
        color,
        avatar: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${slug}`,
      },
    });

    res.status(201).json(formatAgent(agent));
  } catch (err: any) {
    console.error("Error creating agent:", err.message);
    res.status(500).json({ error: "Failed to create agent" });
  }
});

// PATCH /agents/:id — Update mint after on-chain minting
router.patch("/:id", apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { mint, wallet } = req.body;
    if (!mint || !wallet) {
      res.status(400).json({ error: "mint and wallet are required" });
      return;
    }

    const agent = await prisma.agent.findUnique({ where: { id: req.params.id } });
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    if (agent.ownerWallet !== wallet) {
      res.status(403).json({ error: "Only the agent owner can update mint" });
      return;
    }

    const updated = await prisma.agent.update({
      where: { id: req.params.id },
      data: { mint },
    });

    res.json(formatAgent(updated));
  } catch (err: any) {
    console.error("Error updating agent:", err.message);
    res.status(500).json({ error: "Failed to update agent" });
  }
});

export default router;
