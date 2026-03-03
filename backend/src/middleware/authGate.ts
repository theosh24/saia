import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

/**
 * Auth gate middleware — verifies JWT from Authorization header.
 * No NFT ownership check (that's off-chain now).
 */
export async function authGate(
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
    const payload = jwt.verify(token, JWT_SECRET) as { wallet: string; mint?: string };

    req.agentContext = {
      wallet: payload.wallet,
      mint: payload.mint || "",
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
