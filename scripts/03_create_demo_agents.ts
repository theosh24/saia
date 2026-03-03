import * as anchor from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  deriveRegistryPDA,
  deriveAgentStatePDA,
  deriveAgentEntryPDA,
} from "../sdk/src/pda";
import { MPL_CORE_PROGRAM_ID } from "../sdk/src/constants";

interface DemoAgent {
  name: string;
  agentType: Record<string, Record<string, never>>;
  description: string;
  backendUri: string;
  jurisdiction: string;
  tags: string[];
}

const DEMO_AGENTS: DemoAgent[] = [
  {
    name: "Alpha Oracle",
    agentType: { oracle: {} },
    description: "Price oracle agent providing DeFi price feeds",
    backendUri: "https://oracle.vector578.xyz/api",
    jurisdiction: "US",
    tags: ["defi", "oracle", "price-feed"],
  },
  {
    name: "Sigma Trader",
    agentType: { trader: {} },
    description: "Automated trading intent journal for DeFi strategies",
    backendUri: "https://trader.vector578.xyz/api",
    jurisdiction: "EU",
    tags: ["defi", "trading", "journal"],
  },
  {
    name: "Echo Assistant",
    agentType: { assistant: {} },
    description: "AI assistant with on-chain session logging",
    backendUri: "https://assistant.vector578.xyz/api",
    jurisdiction: "US",
    tags: ["ai", "assistant", "chat"],
  },
];

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Spl578;
  const payer = provider.wallet as anchor.Wallet;

  const [registryPDA] = deriveRegistryPDA(program.programId);
  const registry = await program.account.agentRegistry.fetch(registryPDA);

  console.log("Creating demo agents...");
  console.log("  Registry:", registryPDA.toBase58());
  console.log("  Current total agents:", registry.totalAgents.toNumber());

  for (let i = 0; i < DEMO_AGENTS.length; i++) {
    const agent = DEMO_AGENTS[i];
    const asset = Keypair.generate();

    const currentRegistry = await program.account.agentRegistry.fetch(registryPDA);
    const currentIndex = currentRegistry.totalAgents.toNumber();

    const [agentStatePDA] = deriveAgentStatePDA(asset.publicKey, program.programId);
    const [agentEntryPDA] = deriveAgentEntryPDA(registryPDA, currentIndex, program.programId);

    console.log(`\n--- Creating agent ${i + 1}: ${agent.name} ---`);
    console.log("  Mint:", asset.publicKey.toBase58());
    console.log("  AgentState PDA:", agentStatePDA.toBase58());
    console.log("  AgentEntry PDA:", agentEntryPDA.toBase58());

    const tx = await program.methods
      .launchAgent({
        name: agent.name,
        agentType: agent.agentType,
        description: agent.description,
        backendUri: agent.backendUri,
        logicProgram: null,
        jurisdiction: agent.jurisdiction,
        kycLevel: 0,
        tags: agent.tags,
        uri: `https://arweave.net/demo-${agent.name.toLowerCase().replace(/ /g, "-")}.json`,
      })
      .accounts({
        payer: payer.publicKey,
        asset: asset.publicKey,
        registry: registryPDA,
        agentState: agentStatePDA,
        agentEntry: agentEntryPDA,
        treasury: registry.treasury,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([asset])
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ])
      .rpc();

    console.log("  TX:", tx);
  }

  const finalRegistry = await program.account.agentRegistry.fetch(registryPDA);
  console.log(`\nDone! Total agents: ${finalRegistry.totalAgents.toNumber()}`);
}

main().catch(console.error);
