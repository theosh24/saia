import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

// ── Program IDs (updated after anchor keys sync) ────────────────────────────
// These are placeholders — replace after `anchor build && anchor keys list`
export const SPL578_PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
export const ORACLE_PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
export const TRADING_PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
export const ASSISTANT_PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

export const MPL_CORE_PROGRAM_ID = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");

// ── PDA derivation helpers ──────────────────────────────────────────────────

export function deriveRegistryPDA(programId: PublicKey = SPL578_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    programId
  );
}

export function deriveAgentStatePDA(
  mint: PublicKey,
  programId: PublicKey = SPL578_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent_state"), mint.toBuffer()],
    programId
  );
}

export function deriveEvolutionLogPDA(
  mint: PublicKey,
  index: number,
  programId: PublicKey = SPL578_PROGRAM_ID
): [PublicKey, number] {
  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(BigInt(index));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("evolution"), mint.toBuffer(), indexBuf],
    programId
  );
}

export function deriveAgentEntryPDA(
  registry: PublicKey,
  index: number,
  programId: PublicKey = SPL578_PROGRAM_ID
): [PublicKey, number] {
  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(BigInt(index));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent_entry"), registry.toBuffer(), indexBuf],
    programId
  );
}

export function deriveOracleDataPDA(
  mint: PublicKey,
  programId: PublicKey = ORACLE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("oracle_data"), mint.toBuffer()],
    programId
  );
}

export function derivePriceEntryPDA(
  mint: PublicKey,
  token: PublicKey,
  programId: PublicKey = ORACLE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("price"), mint.toBuffer(), token.toBuffer()],
    programId
  );
}

export function deriveTradeJournalPDA(
  mint: PublicKey,
  programId: PublicKey = TRADING_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("trade_journal"), mint.toBuffer()],
    programId
  );
}

export function deriveTradeEntryPDA(
  mint: PublicKey,
  index: number,
  programId: PublicKey = TRADING_PROGRAM_ID
): [PublicKey, number] {
  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(BigInt(index));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("trade"), mint.toBuffer(), indexBuf],
    programId
  );
}

export function deriveSessionStorePDA(
  mint: PublicKey,
  programId: PublicKey = ASSISTANT_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("session_store"), mint.toBuffer()],
    programId
  );
}

export function deriveSessionEntryPDA(
  mint: PublicKey,
  index: number,
  programId: PublicKey = ASSISTANT_PROGRAM_ID
): [PublicKey, number] {
  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(BigInt(index));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("session"), mint.toBuffer(), indexBuf],
    programId
  );
}

// ── Utility helpers ─────────────────────────────────────────────────────────

export async function airdrop(
  connection: anchor.web3.Connection,
  pubkey: PublicKey,
  amount: number = 10 * LAMPORTS_PER_SOL
): Promise<void> {
  const sig = await connection.requestAirdrop(pubkey, amount);
  await connection.confirmTransaction(sig, "confirmed");
}

export function newKeypair(): Keypair {
  return Keypair.generate();
}

export function u64ToLeBytes(n: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(n));
  return buf;
}
