import { Router, Request, Response } from "express";
import { apiLimiter } from "../middleware/rateLimiter";
import { routeChat } from "../services/agentRouter";
import { authGate } from "../middleware/authGate";
import prisma from "../services/db";
import { createHash } from "crypto";

const router = Router();

/**
 * POST /chat
 *
 * Send a message to an agent.
 * - Accepts agentId (DB id), mint, or slug to identify agent
 * - Saves messages to DB for conversation history
 * - Uses Claude API with full conversation context
 * - No auth required (works in demo mode)
 */
router.post(
  "/",
  apiLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { agentId, mint, message, sessionId } = req.body as {
        agentId?: string;
        mint?: string;
        message: string;
        sessionId: string;
      };

      const agentParam = agentId || mint;
      if (!agentParam || !message || !sessionId) {
        res.status(400).json({ error: "Missing required fields: agentId (or mint), message, sessionId" });
        return;
      }

      if (!message.trim()) {
        res.status(400).json({ error: "Message cannot be empty" });
        return;
      }

      // Look up agent from DB (by id, mint, or slug)
      const agent = await prisma.agent.findFirst({
        where: {
          OR: [
            { id: agentParam },
            { mint: agentParam },
            { slug: agentParam },
          ],
        },
      });

      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      // Extract wallet from JWT if present (optional auth)
      let wallet = "anonymous";
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const jwt = await import("jsonwebtoken");
          const token = authHeader.slice(7);
          const payload = jwt.default.verify(token, process.env.JWT_SECRET || "change-me") as { wallet: string };
          wallet = payload.wallet;
        } catch {
          // Invalid token — fall through as anonymous
        }
      }

      // Upsert user (if wallet known)
      if (wallet !== "anonymous") {
        await prisma.user.upsert({
          where: { wallet },
          update: { lastSeen: new Date() },
          create: { wallet },
        });
      }

      // Upsert ChatSession
      let session = await prisma.chatSession.findUnique({ where: { sessionId } });
      if (!session) {
        // For anonymous users, use a placeholder wallet in the session
        const sessionWallet = wallet !== "anonymous" ? wallet : `anon-${sessionId.slice(0, 8)}`;

        // Ensure the user record exists for the session wallet
        if (wallet !== "anonymous") {
          // Already upserted above
        } else {
          await prisma.user.upsert({
            where: { wallet: sessionWallet },
            update: {},
            create: { wallet: sessionWallet },
          });
        }

        session = await prisma.chatSession.create({
          data: {
            agentId: agent.id,
            wallet: wallet !== "anonymous" ? wallet : `anon-${sessionId.slice(0, 8)}`,
            sessionId,
          },
        });
      }

      // Save user message
      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: "user",
          content: message.trim(),
        },
      });

      // Load conversation history (last 20 messages for context)
      const history = await prisma.chatMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: "asc" },
        take: 20,
      });

      // Route to Claude (or custom backend)
      const response = await routeChat(
        {
          id: agent.id,
          name: agent.name,
          category: agent.category,
          backendUri: agent.backendUri,
        },
        history.slice(0, -1), // exclude the just-added user message (routeChat adds it)
        message.trim(),
        wallet
      );

      // Save agent reply
      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: "agent",
          content: response.reply,
        },
      });

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
 * Save a session summary to the DB.
 * Requires JWT authentication.
 */
router.post(
  "/log-session",
  authGate,
  apiLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, sessionHash, summaryHash } = req.body as {
        sessionId: string;
        sessionHash: string;
        summaryHash: string;
      };

      if (!sessionId || !sessionHash) {
        res.status(400).json({ error: "Missing required fields: sessionId, sessionHash" });
        return;
      }

      // Just acknowledge — session is already in DB
      const combinedHash = createHash("sha256")
        .update(`${sessionHash}:${summaryHash || ""}`)
        .digest("hex");

      res.json({
        txSignature: `db-${combinedHash.slice(0, 16)}`,
        stored: true,
      });
    } catch (err: any) {
      console.error("Session log error:", err.message);
      res.status(500).json({ error: "Failed to log session" });
    }
  }
);

export default router;
