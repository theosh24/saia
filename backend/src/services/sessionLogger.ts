import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { connection, getBackendKeypair } from "./solana";
import { createHash } from "crypto";

/**
 * Submit a log-session transaction on-chain via the assistant_agent_578 program.
 *
 * The backend keypair pays for the transaction.
 */
export async function logSessionOnChain(
  mint: PublicKey,
  sessionHash: string,
  summaryHash: string
): Promise<string> {
  // Convert hex hashes to 32-byte buffers
  const sessionHashBuf = Buffer.from(sessionHash, "hex");
  const summaryHashBuf = Buffer.from(summaryHash, "hex");

  if (sessionHashBuf.length !== 32 || summaryHashBuf.length !== 32) {
    throw new Error("Session and summary hashes must be 32 bytes (64 hex chars)");
  }

  // Build action_data: session_hash(32) + summary_hash(32)
  const actionData = Buffer.concat([sessionHashBuf, summaryHashBuf]);

  // For production: construct the full transaction with proper program reference
  // This is a placeholder showing the data structure
  const backendKeypair = getBackendKeypair();

  // In production, you would:
  // 1. Load the assistant_agent_578 IDL
  // 2. Create an Anchor program instance
  // 3. Call execute_agent_action with the action_data
  // 4. Return the transaction signature

  console.log(`[SessionLogger] Would log session for mint ${mint.toBase58()}`);
  console.log(`  Session hash: ${sessionHash}`);
  console.log(`  Summary hash: ${summaryHash}`);
  console.log(`  Payer: ${backendKeypair.publicKey.toBase58()}`);

  // Return a mock signature for now
  return "mock-tx-signature";
}

/**
 * Compute a session hash from conversation content.
 */
export function computeSessionHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
