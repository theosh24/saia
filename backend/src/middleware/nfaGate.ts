import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PublicKey } from "@solana/web3.js";
import { verifyOwnership } from "../services/metaplex";
import type { JWTPayload } from "../types";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

/**
 * NFA Gate middleware:
 * 1. Verify JWT from Authorization header
 * 2. Re-check NFT ownership (with TTL cache in metaplex service)
 * 3. Inject agentContext into request
 */
export async function nfaGate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Re-verify ownership (uses cache with TTL)
    const mint = new PublicKey(payload.mint);
    const wallet = new PublicKey(payload.wallet);
    const isOwner = await verifyOwnership(mint, wallet);

    if (!isOwner) {
      res.status(403).json({ error: "NFT ownership verification failed. You may have transferred the NFT." });
      return;
    }

    req.agentContext = {
      wallet: payload.wallet,
      mint: payload.mint,
    };

    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(401).json({ error: "Token expired. Please re-authenticate." });
    } else if (err.name === "JsonWebTokenError") {
      res.status(401).json({ error: "Invalid token." });
    } else {
      res.status(500).json({ error: "Authentication error." });
    }
  }
}
