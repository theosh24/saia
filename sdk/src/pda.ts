import { PublicKey } from "@solana/web3.js";
import * as constants from "./constants";

function u64ToLeBuffer(n: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(n));
  return buf;
}

export function deriveRegistryPDA(
  programId: PublicKey = constants.SPL578_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(constants.SEED_REGISTRY)],
    programId
  );
}

export function deriveAgentStatePDA(
  mint: PublicKey,
  programId: PublicKey = constants.SPL578_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(constants.SEED_AGENT_STATE), mint.toBuffer()],
    programId
  );
}

export function deriveEvolutionLogPDA(
  mint: PublicKey,
  index: number | bigint,
  programId: PublicKey = constants.SPL578_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(constants.SEED_EVOLUTION),
      mint.toBuffer(),
      u64ToLeBuffer(index),
    ],
    programId
  );
}

export function deriveAgentEntryPDA(
  registry: PublicKey,
  index: number | bigint,
  programId: PublicKey = constants.SPL578_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(constants.SEED_AGENT_ENTRY),
      registry.toBuffer(),
      u64ToLeBuffer(index),
    ],
    programId
  );
}

export function deriveOracleDataPDA(
  mint: PublicKey,
  programId: PublicKey = constants.ORACLE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(constants.SEED_ORACLE_DATA), mint.toBuffer()],
    programId
  );
}

export function derivePriceEntryPDA(
  mint: PublicKey,
  token: PublicKey,
  programId: PublicKey = constants.ORACLE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(constants.SEED_PRICE),
      mint.toBuffer(),
      token.toBuffer(),
    ],
    programId
  );
}

export function deriveTradeJournalPDA(
  mint: PublicKey,
  programId: PublicKey = constants.TRADING_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(constants.SEED_TRADE_JOURNAL), mint.toBuffer()],
    programId
  );
}

export function deriveTradeEntryPDA(
  mint: PublicKey,
  index: number | bigint,
  programId: PublicKey = constants.TRADING_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(constants.SEED_TRADE),
      mint.toBuffer(),
      u64ToLeBuffer(index),
    ],
    programId
  );
}

export function deriveSessionStorePDA(
  mint: PublicKey,
  programId: PublicKey = constants.ASSISTANT_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(constants.SEED_SESSION_STORE), mint.toBuffer()],
    programId
  );
}

export function deriveSessionEntryPDA(
  mint: PublicKey,
  index: number | bigint,
  programId: PublicKey = constants.ASSISTANT_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(constants.SEED_SESSION),
      mint.toBuffer(),
      u64ToLeBuffer(index),
    ],
    programId
  );
}
