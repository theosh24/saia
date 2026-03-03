/**
 * Create demo agents on devnet — raw instruction version (no Anchor IDL needed)
 *
 * Usage:
 *   npx ts-node scripts/03_create_demo_agents_raw.ts
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createHash } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ── Config ────────────────────────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey("4xctWwmCg1JakNF1asQi8zpz3tB8DM3c58SMVPfByjW1");
const MPL_CORE_PROGRAM_ID = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");
const RPC_URL =
  process.env.ANCHOR_PROVIDER_URL ||
  process.env.SOLANA_RPC_URL ||
  "https://api.devnet.solana.com";

function loadKeypair(): Keypair {
  const kpPath =
    process.env.ANCHOR_WALLET ||
    path.join(os.homedir(), ".config", "solana", "id.json");
  const raw = JSON.parse(fs.readFileSync(kpPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

// ── Anchor discriminator ──────────────────────────────────────────────────────
function anchorDiscriminator(ixName: string): Buffer {
  return createHash("sha256")
    .update(`global:${ixName}`)
    .digest()
    .subarray(0, 8);
}

// ── Borsh serialization helpers ───────────────────────────────────────────────
class BorshWriter {
  private bufs: Buffer[] = [];

  writeU8(v: number) {
    const b = Buffer.alloc(1);
    b.writeUInt8(v);
    this.bufs.push(b);
  }

  writeU64(v: bigint) {
    const b = Buffer.alloc(8);
    b.writeBigUInt64LE(v);
    this.bufs.push(b);
  }

  writeString(s: string) {
    const strBuf = Buffer.from(s, "utf-8");
    this.writeU32(strBuf.length);
    this.bufs.push(strBuf);
  }

  writeU32(v: number) {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(v);
    this.bufs.push(b);
  }

  writePubkey(pk: PublicKey) {
    this.bufs.push(pk.toBuffer());
  }

  writeOption<T>(value: T | null, writeFn: (v: T) => void) {
    if (value === null || value === undefined) {
      this.writeU8(0);
    } else {
      this.writeU8(1);
      writeFn(value);
    }
  }

  writeVecString(arr: string[]) {
    this.writeU32(arr.length);
    for (const s of arr) {
      this.writeString(s);
    }
  }

  toBuffer(): Buffer {
    return Buffer.concat(this.bufs);
  }
}

// AgentType enum variants (borsh: single byte)
const AgentTypeEnum: Record<string, number> = {
  assistant: 0,
  oracle: 1,
  trader: 2,
  moderator: 3,
  custom: 4,
};

interface DemoAgent {
  name: string;
  agentType: string;
  description: string;
  backendUri: string;
  jurisdiction: string;
  tags: string[];
}

const DEMO_AGENTS: DemoAgent[] = [
  {
    name: "Alpha Oracle",
    agentType: "oracle",
    description: "Price oracle agent providing DeFi price feeds",
    backendUri: "https://oracle.vector578.xyz/api",
    jurisdiction: "US",
    tags: ["defi", "oracle", "price-feed"],
  },
  {
    name: "Sigma Trader",
    agentType: "trader",
    description: "Automated trading intent journal for DeFi strategies",
    backendUri: "https://trader.vector578.xyz/api",
    jurisdiction: "EU",
    tags: ["defi", "trading", "journal"],
  },
  {
    name: "Echo Assistant",
    agentType: "assistant",
    description: "AI assistant with on-chain session logging",
    backendUri: "https://assistant.vector578.xyz/api",
    jurisdiction: "US",
    tags: ["ai", "assistant", "chat"],
  },
];

function serializeLaunchAgentArgs(agent: DemoAgent, uri: string): Buffer {
  const w = new BorshWriter();
  // LaunchAgentArgs fields in order:
  // name: String, agent_type: AgentType, description: String,
  // backend_uri: String, logic_program: Option<Pubkey>,
  // jurisdiction: String, kyc_level: u8, tags: Vec<String>, uri: String
  w.writeString(agent.name);
  w.writeU8(AgentTypeEnum[agent.agentType]);
  w.writeString(agent.description);
  w.writeString(agent.backendUri);
  w.writeOption(null, () => {}); // logic_program = None
  w.writeString(agent.jurisdiction);
  w.writeU8(0); // kyc_level
  w.writeVecString(agent.tags);
  w.writeString(uri);
  return w.toBuffer();
}

function u64ToLeBuffer(n: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(n));
  return buf;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const connection = new Connection(RPC_URL, "confirmed");
  const payer = loadKeypair();

  const [registryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    PROGRAM_ID
  );

  // Read registry to get current total_agents and treasury
  const registryAccount = await connection.getAccountInfo(registryPDA);
  if (!registryAccount) {
    console.error("Registry not initialized! Run 02_initialize_registry_raw.ts first.");
    return;
  }

  // Parse registry: skip 8-byte discriminator
  // authority(32) + total_agents(u64) + mint_fee_lamports(u64) + treasury(32) + bump(1)
  const totalAgents = Number(registryAccount.data.readBigUInt64LE(40));
  const treasury = new PublicKey(registryAccount.data.subarray(56, 88));

  console.log("Creating demo agents...");
  console.log("  Registry:", registryPDA.toBase58());
  console.log("  Treasury:", treasury.toBase58());
  console.log("  Current total agents:", totalAgents);

  const disc = anchorDiscriminator("launch_agent");

  for (let i = 0; i < DEMO_AGENTS.length; i++) {
    const agent = DEMO_AGENTS[i];
    const asset = Keypair.generate();

    // Re-read registry for current total_agents
    const regInfo = await connection.getAccountInfo(registryPDA);
    const currentIndex = Number(regInfo!.data.readBigUInt64LE(40));

    // Derive PDAs
    const [agentStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent_state"), asset.publicKey.toBuffer()],
      PROGRAM_ID
    );
    const [agentEntryPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("agent_entry"),
        registryPDA.toBuffer(),
        u64ToLeBuffer(currentIndex),
      ],
      PROGRAM_ID
    );

    const uri = `https://arweave.net/demo-${agent.name.toLowerCase().replace(/ /g, "-")}.json`;
    const argsData = serializeLaunchAgentArgs(agent, uri);
    const data = Buffer.concat([disc, argsData]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },      // payer
        { pubkey: asset.publicKey, isSigner: true, isWritable: true },      // asset
        { pubkey: registryPDA, isSigner: false, isWritable: true },         // registry
        { pubkey: agentStatePDA, isSigner: false, isWritable: true },       // agent_state
        { pubkey: agentEntryPDA, isSigner: false, isWritable: true },       // agent_entry
        { pubkey: treasury, isSigner: false, isWritable: true },            // treasury
        { pubkey: MPL_CORE_PROGRAM_ID, isSigner: false, isWritable: false }, // mpl_core_program
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      ],
      data,
    });

    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
    tx.add(ix);
    tx.feePayer = payer.publicKey;

    console.log(`\n--- Creating agent ${i + 1}: ${agent.name} ---`);
    console.log("  Mint:", asset.publicKey.toBase58());

    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [payer, asset], {
        commitment: "confirmed",
      });
      console.log("  TX:", sig);
      console.log(`  Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
    } catch (err: any) {
      console.error("  Error:", err.message || err);
      // Log transaction logs if available
      if (err.logs) {
        console.error("  Logs:", err.logs.join("\n  "));
      }
    }
  }

  // Read final count
  const finalReg = await connection.getAccountInfo(registryPDA);
  const finalTotal = Number(finalReg!.data.readBigUInt64LE(40));
  console.log(`\nDone! Total agents: ${finalTotal}`);
}

main().catch(console.error);
