/**
 * Initialize AgentRegistry on devnet — raw instruction version (no Anchor IDL needed)
 *
 * Usage:
 *   npx ts-node scripts/02_initialize_registry_raw.ts
 *
 * Environment:
 *   ANCHOR_PROVIDER_URL or SOLANA_RPC_URL (default: devnet)
 *   ANCHOR_WALLET or SOLANA_KEYPAIR_PATH  (default: ~/.config/solana/id.json)
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createHash } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ── Config ────────────────────────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey("4xctWwmCg1JakNF1asQi8zpz3tB8DM3c58SMVPfByjW1");
const RPC_URL =
  process.env.ANCHOR_PROVIDER_URL ||
  process.env.SOLANA_RPC_URL ||
  "https://api.devnet.solana.com";

function loadKeypair(): Keypair {
  const kpPath =
    process.env.ANCHOR_WALLET ||
    process.env.SOLANA_KEYPAIR_PATH ||
    path.join(os.homedir(), ".config", "solana", "id.json");
  const raw = JSON.parse(fs.readFileSync(kpPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

// ── Anchor discriminator helper ───────────────────────────────────────────────
function anchorDiscriminator(ixName: string): Buffer {
  const hash = createHash("sha256")
    .update(`global:${ixName}`)
    .digest();
  return hash.subarray(0, 8);
}

// ── Borsh serialization helpers ───────────────────────────────────────────────
function serializeU64(value: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(value);
  return buf;
}

function serializePubkey(pk: PublicKey): Buffer {
  return pk.toBuffer();
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const connection = new Connection(RPC_URL, "confirmed");
  const payer = loadKeypair();

  const MINT_FEE_LAMPORTS = BigInt(10_000_000); // 0.01 SOL
  const treasury = payer.publicKey; // authority = treasury for now

  // Derive registry PDA
  const [registryPDA, _bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    PROGRAM_ID
  );

  console.log("Initializing AgentRegistry...");
  console.log("  RPC:", RPC_URL);
  console.log("  Authority:", payer.publicKey.toBase58());
  console.log("  Treasury:", treasury.toBase58());
  console.log("  Mint fee:", Number(MINT_FEE_LAMPORTS) / 1e9, "SOL");
  console.log("  Registry PDA:", registryPDA.toBase58());
  console.log("  Program:", PROGRAM_ID.toBase58());

  // Check if already initialized
  const existingAccount = await connection.getAccountInfo(registryPDA);
  if (existingAccount) {
    console.log("\nRegistry already initialized! Account exists with", existingAccount.data.length, "bytes.");
    return;
  }

  // Build instruction data:
  // [8 bytes discriminator] [8 bytes mint_fee_lamports] [32 bytes treasury]
  const disc = anchorDiscriminator("initialize_registry");
  const data = Buffer.concat([
    disc,
    serializeU64(MINT_FEE_LAMPORTS),
    serializePubkey(treasury),
  ]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },    // authority
      { pubkey: registryPDA, isSigner: false, isWritable: true },       // registry
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    ],
    data,
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = payer.publicKey;

  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
      commitment: "confirmed",
    });
    console.log("\nRegistry initialized! TX:", sig);
    console.log(`  Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);

    // Read back to verify
    const account = await connection.getAccountInfo(registryPDA);
    if (account) {
      // Skip 8-byte discriminator, read authority (32 bytes)
      const authority = new PublicKey(account.data.subarray(8, 40));
      // total_agents (u64 LE at offset 40)
      const totalAgents = account.data.readBigUInt64LE(40);
      // mint_fee_lamports (u64 LE at offset 48)
      const mintFee = account.data.readBigUInt64LE(48);
      console.log("\nRegistry state:");
      console.log("  Authority:", authority.toBase58());
      console.log("  Total agents:", totalAgents.toString());
      console.log("  Mint fee:", Number(mintFee) / 1e9, "SOL");
    }
  } catch (err: any) {
    if (err.toString().includes("already in use")) {
      console.log("Registry already initialized.");
    } else {
      console.error("Error:", err);
      throw err;
    }
  }
}

main().catch(console.error);
