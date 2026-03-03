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
 * Send a message to an agent. Requires JWT authentication (NFA ownership).
 */
router.post(
  "/",
  nfaGate,
  apiLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { mint, message, sessionId } = req.body as ChatRequest;

      if (!mint || !message || !sessionId) {
        res.status(400).json({ error: "Missing required fields: mint, message, sessionId" });
        return;
      }

      // Verify the mint in the request matches the JWT
      if (mint !== req.agentContext?.mint) {
        res.status(403).json({ error: "Mint mismatch with authenticated token" });
        return;
      }

      const mintPubkey = new PublicKey(mint);
      const response = await routeChat(
        mintPubkey,
        message,
        sessionId,
        req.agentContext!.wallet
      );

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
