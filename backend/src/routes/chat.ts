import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { nfaGate } from "../middleware/nfaGate";
import { apiLimiter } from "../middleware/rateLimiter";
import { routeChat } from "../services/agentRouter";
import { logSessionOnChain, computeSessionHash } from "../services/sessionLogger";
import type { ChatRequest } from "../types";

const router = Router();

/**
 * POST /chat
 *
 * Send a message to an agent.
 * If JWT is present → authenticated mode (verifies ownership).
 * If no JWT → demo mode (no ownership check, uses agent's default AI).
 */
router.post(
  "/",
  apiLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { mint, message, sessionId } = req.body as ChatRequest;

      if (!mint || !message || !sessionId) {
        res.status(400).json({ error: "Missing required fields: mint, message, sessionId" });
        return;
      }

      // If JWT present, verify it (but don't block if missing)
      let wallet = "anonymous";
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const jwt = await import("jsonwebtoken");
          const token = authHeader.slice(7);
          const payload = jwt.default.verify(token, process.env.JWT_SECRET || "change-me") as { wallet: string; mint: string };
          if (payload.mint !== mint) {
            res.status(403).json({ error: "Mint mismatch with authenticated token" });
            return;
          }
          wallet = payload.wallet;
        } catch {
          // Invalid token — allow as demo mode
        }
      }

      const mintPubkey = new PublicKey(mint);
      const response = await routeChat(mintPubkey, message, sessionId, wallet);

      res.json({
        reply: response.reply,
        sessionHash: response.sessionHash,
        latencyMs: response.latencyMs,
      });
    } catch (err: any) {
      console.error("Chat error:", err.message);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  }
);

/**
 * POST /chat/log-session
 *
 * Log a chat session on-chain via assistant_agent_578.
 * Requires JWT authentication.
 */
router.post(
  "/log-session",
  nfaGate,
  apiLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { mint, sessionHash, summaryHash } = req.body as {
        mint: string;
        sessionHash: string;
        summaryHash: string;
      };

      if (!mint || !sessionHash || !summaryHash) {
        res.status(400).json({
          error: "Missing required fields: mint, sessionHash, summaryHash",
        });
        return;
      }

      if (mint !== req.agentContext?.mint) {
        res.status(403).json({ error: "Mint mismatch with authenticated token" });
        return;
      }

      const mintPubkey = new PublicKey(mint);
      const txSignature = await logSessionOnChain(
        mintPubkey,
        sessionHash,
        summaryHash
      );

      res.json({ txSignature });
    } catch (err: any) {
      console.error("Session log error:", err.message);
      res.status(500).json({ error: "Failed to log session on-chain" });
    }
  }
);

export default router;
