import {
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { createHash } from "crypto";

const ED25519_PROGRAM_ID = new PublicKey(
  "Ed25519SigVerify111111111111111111111111111"
);

/**
 * Compute SHA-256 hash of arbitrary data.
 */
export function sha256(data: Buffer | Uint8Array): Buffer {
  return createHash("sha256").update(data).digest();
}

/**
 * Encode a u64 number as little-endian 8-byte buffer.
 * Uses BigInt internally to avoid BN issues with zero.
 */
export function u64ToLeBytes(n: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(n));
  return buf;
}

/**
 * Build an Ed25519 signature verification instruction.
 *
 * This instruction must be placed BEFORE the program instruction
 * in the same transaction for instruction sysvar introspection.
 */
export function buildEd25519VerifyInstruction(
  publicKey: Uint8Array,
  message: Buffer,
  signature: Uint8Array
): TransactionInstruction {
  const headerSize = 2;
  const offsetsSize = 14;
  const dataOffset = headerSize + offsetsSize;
  const sigOffset = dataOffset;
  const pubkeyOffset = sigOffset + 64;
  const msgOffset = pubkeyOffset + 32;

  const data = Buffer.alloc(msgOffset + message.length);

  // Header
  data.writeUInt8(1, 0); // num_signatures
  data.writeUInt8(0, 1); // padding

  // Offsets (7 x u16)
  data.writeUInt16LE(sigOffset, 2);       // signature_offset
  data.writeUInt16LE(0xffff, 4);          // signature_instruction_index (same tx)
  data.writeUInt16LE(pubkeyOffset, 6);    // public_key_offset
  data.writeUInt16LE(0xffff, 8);          // public_key_instruction_index
  data.writeUInt16LE(msgOffset, 10);      // message_data_offset
  data.writeUInt16LE(message.length, 12); // message_data_size
  data.writeUInt16LE(0xffff, 14);         // message_instruction_index

  // Payload
  Buffer.from(signature).copy(data, sigOffset);
  Buffer.from(publicKey).copy(data, pubkeyOffset);
  message.copy(data, msgOffset);

  return new TransactionInstruction({
    keys: [],
    programId: ED25519_PROGRAM_ID,
    data,
  });
}
