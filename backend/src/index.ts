import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth";
import agentsRoutes from "./routes/agents";
import chatRoutes from "./routes/chat";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:8080,http://localhost:3000").split(",");

// Middleware
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
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

// Start server (skip in Vercel serverless environment)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Vector578] Backend API running on port ${PORT}`);
    console.log(`[Vector578] RPC: ${process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"}`);
    console.log(`[Vector578] CORS origins: ${ALLOWED_ORIGINS.join(", ")}`);
  });
}

export default app;
