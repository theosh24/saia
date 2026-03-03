/**
 * API service layer — bridges frontend to Vector578 backend.
 * Uses Vite proxy in dev (/api → localhost:3001).
 */

const BASE = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL ?? "");

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts?.headers as Record<string, string>),
  };

  // Attach JWT if available
  const token = sessionStorage.getItem("v578_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? "Unknown error");
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Types ───────────────────────────────────────────────────────────
export interface Agent {
  id: string;
  mint: string;
  name: string;
  category: string;
  owner: string;
  description: string;
  verified: boolean;
  kycLevel: number;
  retired: boolean;
  createdAt: string;
  tags: string[];
  backendUri: string;
  logicContract: string;
  evolutions: number;
  reputationScore: number;
  position: [number, number, number];
  color: string;
  avatar: string;
  source?: string;
}

export interface AgentsResponse {
  agents: Agent[];
  total: number;
  page: number;
  limit: number;
  source?: string;
}

export interface AuthResponse {
  token: string;
  expiresIn: number;
  agentMint: string;
}

export interface ChatResponse {
  reply: string;
  sessionHash: string;
  latencyMs: number;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}

// ─── Endpoints ───────────────────────────────────────────────────────

export function healthCheck(): Promise<HealthResponse> {
  return request("/health");
}

export function getAgents(page = 0, limit = 20): Promise<AgentsResponse> {
  return request(`/agents?page=${page}&limit=${limit}`);
}

export function getAgent(slugOrMint: string): Promise<Agent> {
  return request(`/agents/${encodeURIComponent(slugOrMint)}`);
}

export function verifyOwnership(body: {
  wallet: string;
  mint: string;
  message: string;
  signature: string;
}): Promise<AuthResponse> {
  return request("/auth/verify-ownership", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function sendChat(body: {
  mint: string;
  message: string;
  sessionId: string;
}): Promise<ChatResponse> {
  return request("/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function logSession(body: {
  mint: string;
  sessionHash: string;
  summaryHash: string;
}): Promise<{ txSignature: string }> {
  return request("/chat/log-session", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
