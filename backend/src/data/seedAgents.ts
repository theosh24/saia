/**
 * Seed agent data used as fallback when on-chain registry
 * is not yet deployed or empty. Each agent = one building in the city.
 */
export interface SeedAgent {
  id: string;
  mint: string; // placeholder mint until real mints are assigned
  name: string;
  category: string;
  owner: string;
  description: string;
  verified: boolean;
  kycLevel: number;
  retired: boolean;
  createdAt: string;
  tags: string[];
  backendUri: string;
  logicContract: string;
  evolutions: number;
  reputationScore: number;
  position: [number, number, number];
  color: string;
  avatar: string;
}

export const SEED_AGENTS: SeedAgent[] = [
  {
    id: "VEC-578-#1",
    mint: "AgNt1111111111111111111111111111111111111111",
    name: "Sentinel Alpha",
    category: "Security",
    owner: "8xK3f9mQ",
    description:
      "AI-driven cybersecurity monitoring and threat detection system for Solana smart contracts.",
    verified: true,
    kycLevel: 2,
    retired: false,
    createdAt: "2026-02-20T00:00:00Z",
    tags: ["security", "audit", "real-time"],
    backendUri: "https://api.saia.network/agents/sentinel",
    logicContract:
      "0x004BacdEaC9b79F74cE05496F9eA8d16BE3635Ab",
    evolutions: 3,
    reputationScore: 98.7,
    position: [0, 8, -20],
    color: "#00e5ff",
    avatar:
      "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=sentinel",
  },
  {
    id: "VEC-578-#2",
    mint: "AgNt2222222222222222222222222222222222222222",
    name: "DataWeave",
    category: "Analytics",
    owner: "3mQr8xP2",
    description:
      "High-throughput data analysis agent for on-chain metrics and DeFi analytics.",
    verified: true,
    kycLevel: 1,
    retired: false,
    createdAt: "2026-02-18T00:00:00Z",
    tags: ["analytics", "data", "defi"],
    backendUri: "https://api.saia.network/agents/dataweave",
    logicContract:
      "0x117CadEaB2c89A73dF14596E8bC7d22DE4712Fc",
    evolutions: 1,
    reputationScore: 93.2,
    position: [25, 12, -10],
    color: "#8B5CF6",
    avatar:
      "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=dataweave",
  },
  {
    id: "VEC-578-#3",
    mint: "AgNt3333333333333333333333333333333333333333",
    name: "NexusBot",
    category: "DeFi",
    owner: "7pLz4nRw",
    description:
      "Automated DeFi yield optimization across multiple Solana protocols.",
    verified: false,
    kycLevel: 0,
    retired: false,
    createdAt: "2026-02-22T00:00:00Z",
    tags: ["defi", "yield", "automation"],
    backendUri: "https://api.saia.network/agents/nexusbot",
    logicContract:
      "0x228DfeBbC3d90B84eG25607F9dB9e27CF5823Gd",
    evolutions: 0,
    reputationScore: 85.9,
    position: [-25, 15, 5],
    color: "#ff0090",
    avatar:
      "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=nexusbot",
  },
  {
    id: "VEC-578-#4",
    mint: "AgNt4444444444444444444444444444444444444444",
    name: "OracleX",
    category: "Oracle",
    owner: "9kWs2mTv",
    description:
      "Decentralized price feed oracle with sub-second latency for Solana.",
    verified: true,
    kycLevel: 3,
    retired: false,
    createdAt: "2026-02-15T00:00:00Z",
    tags: ["oracle", "price-feed", "low-latency"],
    backendUri: "https://api.saia.network/agents/oraclex",
    logicContract:
      "0x339EgfCcD4eA1C95fH36718G0eC0f38DG6934He",
    evolutions: 5,
    reputationScore: 94.8,
    position: [10, 6, 25],
    color: "#00e676",
    avatar:
      "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=oraclex",
  },
  {
    id: "VEC-578-#5",
    mint: "AgNt5555555555555555555555555555555555555555",
    name: "GuardianAI",
    category: "Compliance",
    owner: "5jRn1pKx",
    description:
      "Regulatory compliance monitoring agent for institutional DeFi operations.",
    verified: true,
    kycLevel: 3,
    retired: false,
    createdAt: "2026-02-12T00:00:00Z",
    tags: ["compliance", "regulatory", "institutional"],
    backendUri: "https://api.saia.network/agents/guardian",
    logicContract:
      "0x44AFhgDdE5fB2D06gI47829H1fD1g49EH7045If",
    evolutions: 2,
    reputationScore: 97.3,
    position: [-20, 10, -25],
    color: "#ffea00",
    avatar:
      "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=guardian",
  },
  {
    id: "VEC-578-#6",
    mint: "AgNt6666666666666666666666666666666666666666",
    name: "FlowMaster",
    category: "Liquidity",
    owner: "2xBm6qJs",
    description:
      "Intelligent liquidity management agent for AMM pools and order books.",
    verified: true,
    kycLevel: 1,
    retired: false,
    createdAt: "2026-02-24T00:00:00Z",
    tags: ["liquidity", "amm", "market-making"],
    backendUri: "https://api.saia.network/agents/flowmaster",
    logicContract:
      "0x55BGihEeF6gC3E17hJ58930I2gE2h50FI8156Jg",
    evolutions: 1,
    reputationScore: 96.1,
    position: [18, 9, -15],
    color: "#00e5ff",
    avatar:
      "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=flowmaster",
  },
  {
    id: "VEC-578-#7",
    mint: "AgNt7777777777777777777777777777777777777777",
    name: "Synth-9",
    category: "Content",
    owner: "4wCn8rKt",
    description:
      "AI content generation agent specialized in technical documentation and reports.",
    verified: false,
    kycLevel: 0,
    retired: false,
    createdAt: "2026-02-26T00:00:00Z",
    tags: ["content", "generation", "nlp"],
    backendUri: "https://api.saia.network/agents/synth9",
    logicContract:
      "0x66CHjiFeG7hD4F28iK69041J3hF3i61GJ9267Kh",
    evolutions: 0,
    reputationScore: 88.4,
    position: [-12, 7, 20],
    color: "#8B5CF6",
    avatar:
      "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=synth9",
  },
  {
    id: "VEC-578-#8",
    mint: "AgNt8888888888888888888888888888888888888888",
    name: "Echo",
    category: "Assistant",
    owner: "0xeff4386D",
    description:
      "Multi-modal customer support agent with natural language understanding.",
    verified: false,
    kycLevel: 0,
    retired: false,
    createdAt: "2026-02-27T00:00:00Z",
    tags: [],
    backendUri: "https://api.vector578.com",
    logicContract:
      "0x004BacdEaC9b79F74cE05496F9eA8d16BE3635Ab",
    evolutions: 0,
    reputationScore: 82.1,
    position: [15, 11, 10],
    color: "#ff0090",
    avatar:
      "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=echo",
  },
];
