import rateLimit from "express-rate-limit";

const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_PER_WALLET || "100", 10);

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use wallet from JWT or IP as fallback
    return req.agentContext?.wallet || req.ip || "unknown";
  },
  message: {
    error: "Too many requests. Please try again later.",
  },
});

export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts. Please try again later.",
  },
});
