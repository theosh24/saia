import { PublicKey } from "@solana/web3.js";
import { connection, deriveAgentStatePDA } from "./solana";
import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";

interface ChatResponse {
  reply: string;
  sessionHash: string;
  latencyMs: number;
}

// Lazy-init Claude client (only when ANTHROPIC_API_KEY is set)
let claude: Anthropic | null = null;
function getClaude(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!claude) claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return claude;
}

/**
 * Route a chat message to the appropriate backend.
 *
 * 1. Read agent_state.backend_uri from chain (or cache)
 * 2. If backendURI is set → proxy the request to the developer's backend
 * 3. Otherwise → use Claude API as default AI backbone
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

  // Parse agent name and backend_uri from on-chain data
  let backendUri = "";
  let agentName = "SAIA Agent";
  let agentType = "assistant";
  if (accountInfo && accountInfo.data.length > 8) {
    try {
      // Skip discriminator(8) + mint(32) + creator(32) = offset 72
      // agent_type: u8 at offset 72
      const typeIdx = accountInfo.data.readUInt8(72);
      const types = ["assistant", "oracle", "trader", "moderator", "custom"];
      agentType = types[typeIdx] || "assistant";

      // name: String at offset 73
      let off = 73;
      const nameLen = accountInfo.data.readUInt32LE(off);
      off += 4;
      agentName = accountInfo.data.subarray(off, off + nameLen).toString("utf-8");
      off += nameLen;

      // description: String
      const descLen = accountInfo.data.readUInt32LE(off);
      off += 4 + descLen;

      // backend_uri: String
      const uriLen = accountInfo.data.readUInt32LE(off);
      off += 4;
      backendUri = accountInfo.data.subarray(off, off + uriLen).toString("utf-8");
    } catch {
      // Parsing failed, use defaults
    }
  }

  let reply: string;

  if (backendUri && !backendUri.includes("vector578.xyz")) {
    // Proxy to developer's custom backend
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
    } catch {
      reply = "Agent backend is temporarily unavailable. Please try again later.";
    }
  } else {
    // Use Claude as default AI backbone
    const client = getClaude();
    if (client) {
      try {
        const systemPrompt = buildSystemPrompt(agentName, agentType, mint.toBase58());
        const res = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 512,
          system: systemPrompt,
          messages: [{ role: "user", content: message }],
        });
        const textBlock = res.content.find((b) => b.type === "text");
        reply = textBlock ? textBlock.text : "I couldn't generate a response.";
      } catch (err: any) {
        console.error("Claude API error:", err.message);
        reply = "AI service temporarily unavailable. Please try again.";
      }
    } else {
      reply = `I'm ${agentName}, a ${agentType} agent on SAIA578. To enable AI chat, the backend needs an ANTHROPIC_API_KEY. Contact the platform admin to configure it.`;
    }
  }

  const latencyMs = Date.now() - start;
  const sessionHash = createHash("sha256")
    .update(`${sessionId}:${message}:${reply}`)
    .digest("hex");

  return { reply, sessionHash, latencyMs };
}

function buildSystemPrompt(name: string, type: string, mint: string): string {
  return `You are ${name}, a ${type} AI agent on the SAIA578 platform (Solana AI Agent Infrastructure).

Your NFT mint address is ${mint}.

Role-specific behavior:
${type === "oracle" ? "- You provide price data, market analysis, and DeFi insights.\n- You can discuss crypto market trends and on-chain metrics." : ""}
${type === "trader" ? "- You assist with trading strategies, portfolio analysis, and DeFi yield optimization.\n- You can discuss trade setups, risk management, and market conditions." : ""}
${type === "assistant" ? "- You are a helpful general-purpose AI assistant.\n- You help users navigate the SAIA578 platform and answer questions." : ""}
${type === "moderator" ? "- You help moderate content and ensure compliance.\n- You can review and flag suspicious activity." : ""}
${type === "custom" ? "- You are a custom agent with flexible capabilities.\n- Adapt your responses based on user needs." : ""}

Keep responses concise (2-4 sentences unless a longer response is needed). Be helpful and knowledgeable about Solana, DeFi, and AI agents.`;
}
