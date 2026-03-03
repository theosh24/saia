import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import prisma from "../services/db";
import { authLimiter } from "../middleware/rateLimiter";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_EXPIRY = 3600; // 1 hour

function verifyWalletSignature(wallet: string, message: string, signature: string): boolean {
  try {
    const walletPubkey = new PublicKey(wallet);
    const sigBytes = bs58.decode(signature);
    const messageBytes = new TextEncoder().encode(message);
    return nacl.sign.detached.verify(messageBytes, sigBytes, walletPubkey.toBytes());
  } catch {
    return false;
  }
}

/**
 * POST /auth/connect
 *
 * Simple wallet authentication — proves ownership of a wallet via ed25519 signature.
 * No NFT ownership check needed.
 * Message format: "saia578:connect:{wallet}:{timestamp}"
 */
router.post(
  "/connect",
  authLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { wallet, message, signature } = req.body as {
        wallet: string;
        message: string;
        signature: string;
      };

      if (!wallet || !message || !signature) {
        res.status(400).json({ error: "Missing required fields: wallet, message, signature" });
        return;
      }

      // Verify ed25519 signature
      if (!verifyWalletSignature(wallet, message, signature)) {
        res.status(401).json({ error: "Invalid signature" });
        return;
      }

      // Verify message format and timestamp
      const parts = message.split(":");
      if (parts.length < 4 || parts[0] !== "saia578" || parts[1] !== "connect") {
        res.status(400).json({ error: "Invalid message format. Expected: saia578:connect:{wallet}:{timestamp}" });
        return;
      }

      const msgTimestamp = parseInt(parts[parts.length - 1], 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - msgTimestamp) > 300) {
        res.status(400).json({ error: "Message timestamp expired (>5 min)" });
        return;
      }

      // Upsert user in DB
      await prisma.user.upsert({
        where: { wallet },
        update: { lastSeen: new Date() },
        create: { wallet },
      });

      // Issue JWT
      const token = jwt.sign({ wallet }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

      res.json({ token, expiresIn: JWT_EXPIRY, wallet });
    } catch (err: any) {
      console.error("Auth connect error:", err.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * POST /auth/verify-ownership
 *
 * Kept for backward compatibility.
 * Now just verifies wallet signature (no NFT ownership check).
 * Message format: "vector578:verify:{wallet}:{mint}:{timestamp}" OR "saia578:connect:{wallet}:{timestamp}"
 */
router.post(
  "/verify-ownership",
  authLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { wallet, mint, message, signature } = req.body as {
        wallet: string;
        mint?: string;
        message: string;
        signature: string;
      };

      if (!wallet || !message || !signature) {
        res.status(400).json({ error: "Missing required fields: wallet, message, signature" });
        return;
      }

      // Verify ed25519 signature
      if (!verifyWalletSignature(wallet, message, signature)) {
        res.status(401).json({ error: "Invalid signature" });
        return;
      }

      // Verify message has a recent timestamp
      const parts = message.split(":");
      const msgTimestamp = parseInt(parts[parts.length - 1], 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - msgTimestamp) > 300) {
        res.status(400).json({ error: "Message timestamp expired (>5 min)" });
        return;
      }

      // Upsert user in DB
      await prisma.user.upsert({
        where: { wallet },
        update: { lastSeen: new Date() },
        create: { wallet },
      });

      // If a mint was provided, check it's associated with this wallet's agents
      let agentMint = mint || "";
      if (mint) {
        const agent = await prisma.agent.findFirst({
          where: { mint, ownerWallet: wallet },
        });
        agentMint = agent?.mint || mint;
      }

      // Issue JWT
      const token = jwt.sign({ wallet }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

      res.json({ token, expiresIn: JWT_EXPIRY, agentMint, wallet });
    } catch (err: any) {
      console.error("Auth error:", err.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
