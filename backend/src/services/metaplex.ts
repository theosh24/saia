import { PublicKey } from "@solana/web3.js";
import { connection } from "./solana";
import { getCachedOwner, setCachedOwner } from "../cache/ownershipCache";

/**
 * Fetch the owner of a Metaplex Core asset.
 * Uses an in-memory TTL cache to reduce RPC calls.
 *
 * Metaplex Core BaseAssetV1 layout:
 *   key (1 byte) + owner (32 bytes) + ...
 */
export async function getAssetOwner(mint: PublicKey): Promise<PublicKey | null> {
  const mintStr = mint.toBase58();

  // Check cache first
  const cached = getCachedOwner(mintStr);
  if (cached) {
    return new PublicKey(cached);
  }

  // Fetch from RPC
  const accountInfo = await connection.getAccountInfo(mint);
  if (!accountInfo || accountInfo.data.length < 33) {
    return null;
  }

  // Read owner from bytes [1..33]
  const ownerBytes = accountInfo.data.subarray(1, 33);
  const owner = new PublicKey(ownerBytes);

  // Cache the result
  setCachedOwner(mintStr, owner.toBase58());

  return owner;
}

/**
 * Verify that a given wallet is the owner of the Metaplex Core asset.
 */
export async function verifyOwnership(
  mint: PublicKey,
  wallet: PublicKey
): Promise<boolean> {
  const owner = await getAssetOwner(mint);
  if (!owner) return false;
  return owner.equals(wallet);
}
