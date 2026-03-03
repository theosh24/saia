import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const SEED_AGENTS = [
  {
    name: "Sentinel Alpha",
    category: "Security",
    ownerWallet: "8xK3f9mQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    description: "AI-driven cybersecurity monitoring and threat detection system for Solana smart contracts.",
    verified: true,
    kycLevel: 2,
    tags: ["security", "audit", "real-time"],
    evolutions: 3,
    reputationScore: 98.7,
    position: [0, 8, -20],
    color: "#00e5ff",
  },
  {
    name: "DataWeave",
    category: "Analytics",
    ownerWallet: "3mQr8xP2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    description: "High-throughput data analysis agent for on-chain metrics and DeFi analytics.",
    verified: true,
    kycLevel: 1,
    tags: ["analytics", "data", "defi"],
    evolutions: 1,
    reputationScore: 93.2,
    position: [25, 12, -10],
    color: "#8B5CF6",
  },
  {
    name: "NexusBot",
    category: "DeFi",
    ownerWallet: "7pLz4nRwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    description: "Automated DeFi yield optimization across multiple Solana protocols.",
    verified: false,
    kycLevel: 0,
    tags: ["defi", "yield", "automation"],
    evolutions: 0,
    reputationScore: 85.9,
    position: [-25, 15, 5],
    color: "#ff0090",
  },
  {
    name: "OracleX",
    category: "Oracle",
    ownerWallet: "9kWs2mTvAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    description: "Decentralized price feed oracle with sub-second latency for Solana.",
    verified: true,
    kycLevel: 3,
    tags: ["oracle", "price-feed", "low-latency"],
    evolutions: 5,
    reputationScore: 94.8,
    position: [10, 6, 25],
    color: "#00e676",
  },
  {
    name: "GuardianAI",
    category: "Compliance",
    ownerWallet: "5jRn1pKxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    description: "Regulatory compliance monitoring agent for institutional DeFi operations.",
    verified: true,
    kycLevel: 3,
    tags: ["compliance", "regulatory", "institutional"],
    evolutions: 2,
    reputationScore: 97.3,
    position: [-20, 10, -25],
    color: "#ffea00",
  },
  {
    name: "FlowMaster",
    category: "Liquidity",
    ownerWallet: "2xBm6qJsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    description: "Intelligent liquidity management agent for AMM pools and order books.",
    verified: true,
    kycLevel: 1,
    tags: ["liquidity", "amm", "market-making"],
    evolutions: 1,
    reputationScore: 96.1,
    position: [18, 9, -15],
    color: "#00e5ff",
  },
  {
    name: "Synth-9",
    category: "Content",
    ownerWallet: "4wCn8rKtAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    description: "AI content generation agent specialized in technical documentation and reports.",
    verified: false,
    kycLevel: 0,
    tags: ["content", "generation", "nlp"],
    evolutions: 0,
    reputationScore: 88.4,
    position: [-12, 7, 20],
    color: "#8B5CF6",
  },
  {
    name: "Echo",
    category: "Assistant",
    ownerWallet: "EchoAgntAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    description: "Multi-modal customer support agent with natural language understanding.",
    verified: false,
    kycLevel: 0,
    tags: ["assistant", "support", "nlp"],
    evolutions: 0,
    reputationScore: 82.1,
    position: [15, 11, 10],
    color: "#ff0090",
  },
];

async function main() {
  console.log("Seeding database...");

  for (const agent of SEED_AGENTS) {
    // Upsert user
    await prisma.user.upsert({
      where: { wallet: agent.ownerWallet },
      update: { lastSeen: new Date() },
      create: { wallet: agent.ownerWallet },
    });

    const slug = slugify(agent.name);

    // Upsert agent
    await prisma.agent.upsert({
      where: { slug },
      update: {
        description: agent.description,
        verified: agent.verified,
        kycLevel: agent.kycLevel,
        tags: agent.tags,
        evolutions: agent.evolutions,
        reputationScore: agent.reputationScore,
        position: agent.position,
        color: agent.color,
      },
      create: {
        name: agent.name,
        slug,
        category: agent.category,
        ownerWallet: agent.ownerWallet,
        description: agent.description,
        verified: agent.verified,
        kycLevel: agent.kycLevel,
        tags: agent.tags,
        evolutions: agent.evolutions,
        reputationScore: agent.reputationScore,
        position: agent.position,
        color: agent.color,
        avatar: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${slug}`,
      },
    });

    console.log(`  Seeded agent: ${agent.name} (${slug})`);
  }

  console.log(`Done! Seeded ${SEED_AGENTS.length} agents.`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
