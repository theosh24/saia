import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { execSync } from "child_process";

dotenv.config();

import prisma from "./services/db";
import authRoutes from "./routes/auth";
import agentsRoutes from "./routes/agents";
import chatRoutes from "./routes/chat";

// Sync DB schema at startup (runs prisma db push)
try {
  console.log("[SAIA578] Syncing database schema...");
  execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
  console.log("[SAIA578] Database schema synced.");
} catch (err) {
  console.error("[SAIA578] DB schema sync failed (continuing anyway):", err);
}

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:8080,http://localhost:3000").split(",").map(s => s.trim());

// Middleware — dynamic CORS: allow listed origins + any *.vercel.app preview
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow explicitly listed origins
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // Allow any Vercel preview deployment
      if (origin.endsWith(".vercel.app")) return callback(null, true);
      // Allow localhost for dev
      if (origin.startsWith("http://localhost:")) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/auth", authRoutes);
app.use("/agents", agentsRoutes);
app.use("/chat", chatRoutes);

// Graceful shutdown
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Start server (skip in Vercel serverless environment)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[SAIA578] Backend API running on port ${PORT}`);
    console.log(`[SAIA578] CORS origins: ${ALLOWED_ORIGINS.join(", ")}`);
  });
}

export default app;
