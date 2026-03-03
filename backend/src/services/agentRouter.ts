import { PublicKey } from "@solana/web3.js";
import { connection, deriveAgentStatePDA } from "./solana";
import { createHash } from "crypto";

interface ChatResponse {
  reply: string;
  sessionHash: string;
  latencyMs: number;
}

/**
 * Route a chat message to the appropriate backend.
 *
 * 1. Read agent_state.backend_uri from chain (or cache)
 * 2. If backendURI is set → proxy the request to the developer's backend
 * 3. Otherwise → return a default LLM response placeholder
 */
export async function routeChat(
  mint: PublicKey,
  message: string,
  sessionId: string,
  wallet: string
): Promise<ChatResponse> {
  const start = Date.now();

  // Fetch agent state to get backend_uri
  const [agentStatePDA] = deriveAgentStatePDA(mint);
  const accountInfo = await connection.getAccountInfo(agentStatePDA);

  let backendUri = "";
  if (accountInfo && accountInfo.data.length > 0) {
    // Parse backend_uri from the raw account data
    // For production, use the Anchor IDL to deserialize properly
    // For now, we'll attempt to proxy if the URI is available
    try {
      // Quick approach: use Anchor deserialization in production
      // Placeholder: extract URI or fallback to default
      backendUri = ""; // Would be parsed from account data
    } catch {
      backendUri = "";
    }
  }

  let reply: string;

  if (backendUri) {
    // Proxy to developer's backend
    try {
      const response = await fetch(backendUri, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-NFA-Wallet": wallet,
          "X-NFA-Mint": mint.toBase58(),
          "X-NFA-Session": sessionId,
        },
        body: JSON.stringify({ message, sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = (await response.json()) as { reply?: string; message?: string };
      reply = data.reply || data.message || "No response from agent backend.";
    } catch (err) {
      reply = "Agent backend is temporarily unavailable. Please try again later.";
    }
  } else {
    // Default LLM fallback
    reply = `[Vector578 Default] Received your message: "${message.substring(0, 100)}". This agent does not have a custom backend configured. Contact the agent creator to set up a backendURI.`;
  }

  const latencyMs = Date.now() - start;
  const sessionHash = createHash("sha256")
    .update(`${sessionId}:${message}:${reply}`)
    .digest("hex");

  return { reply, sessionHash, latencyMs };
}
