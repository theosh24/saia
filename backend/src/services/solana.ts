import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(
  process.env.SPL578_PROGRAM_ID || "4xctWwmCg1JakNF1asQi8zpz3tB8DM3c58SMVPfByjW1"
);

export const connection = new Connection(RPC_URL, "confirmed");

export function getBackendKeypair(): Keypair {
  if (process.env.BACKEND_KEYPAIR_BASE64) {
    const decoded = Buffer.from(process.env.BACKEND_KEYPAIR_BASE64, "base64");
    const secretKey = JSON.parse(decoded.toString());
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  }
  const keypairPath = process.env.BACKEND_KEYPAIR_PATH || "./backend-wallet.json";
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

export function deriveAgentStatePDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent_state"), mint.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveRegistryPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    PROGRAM_ID
  );
}

export function deriveAgentEntryPDA(
  registry: PublicKey,
  index: number
): [PublicKey, number] {
  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(BigInt(index));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent_entry"), registry.toBuffer(), indexBuf],
    PROGRAM_ID
  );
}

export { PROGRAM_ID };
