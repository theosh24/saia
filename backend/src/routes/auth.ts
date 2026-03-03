import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { verifyOwnership } from "../services/metaplex";
import { deriveAgentStatePDA, connection } from "../services/solana";
import { authLimiter } from "../middleware/rateLimiter";
import type { VerifyOwnershipRequest } from "../types";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_EXPIRY = 3600; // 1 hour

/**
 * POST /auth/verify-ownership
 *
 * Verify wallet ownership of an NFA via ed25519 signature.
 * Returns a JWT for subsequent authenticated requests.
 */
router.post(
  "/verify-ownership",
  authLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { wallet, mint, message, signature } =
        req.body as VerifyOwnershipRequest;

      if (!wallet || !mint || !message || !signature) {
        res.status(400).json({ error: "Missing required fields: wallet, mint, message, signature" });
        return;
      }

      // Decode base58 values
      let walletPubkey: PublicKey;
      let mintPubkey: PublicKey;
      let sigBytes: Uint8Array;

      try {
        walletPubkey = new PublicKey(wallet);
        mintPubkey = new PublicKey(mint);
        sigBytes = bs58.decode(signature);
      } catch {
        res.status(400).json({ error: "Invalid base58 encoding for wallet, mint, or signature" });
        return;
      }

      // Verify ed25519 signature
      const messageBytes = new TextEncoder().encode(message);
      const isValidSig = nacl.sign.detached.verify(
        messageBytes,
        sigBytes,
        walletPubkey.toBytes()
      );

      if (!isValidSig) {
        res.status(401).json({ error: "Invalid signature" });
        return;
      }

      // Verify message format: "vector578:verify:{wallet}:{mint}:{timestamp}"
      const parts = message.split(":");
      if (
        parts.length < 5 ||
        parts[0] !== "vector578" ||
        parts[1] !== "verify"
      ) {
        res.status(400).json({ error: "Invalid message format" });
        return;
      }

      // Check timestamp is recent (within 5 minutes)
      const msgTimestamp = parseInt(parts[parts.length - 1], 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - msgTimestamp) > 300) {
        res.status(400).json({ error: "Message timestamp expired (>5 min)" });
        return;
      }

      // Verify NFT ownership via Metaplex Core
      const isOwner = await verifyOwnership(mintPubkey, walletPubkey);
      if (!isOwner) {
        res.status(403).json({ error: "Wallet does not own this NFT" });
        return;
      }

      // Fetch agent state to check retired status and get metadata
      const [agentStatePDA] = deriveAgentStatePDA(mintPubkey);
      const agentStateInfo = await connection.getAccountInfo(agentStatePDA);
      if (!agentStateInfo) {
        res.status(404).json({ error: "Agent state not found for this mint" });
        return;
      }

      // Issue JWT
      const token = jwt.sign(
        { wallet, mint } as Record<string, string>,
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      res.json({
        token,
        expiresIn: JWT_EXPIRY,
        agentMint: mint,
      });
    } catch (err: any) {
      console.error("Auth error:", err.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
