export interface JWTPayload {
  wallet: string;
  mint?: string;
  iat: number;
  exp: number;
}

export interface VerifyOwnershipRequest {
  wallet: string;
  mint?: string;
  message: string;
  signature: string;
}

export interface ChatRequest {
  agentId?: string;
  mint?: string;
  message: string;
  sessionId: string;
}

export interface AgentContext {
  wallet: string;
  mint: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      agentContext?: AgentContext;
    }
  }
}
