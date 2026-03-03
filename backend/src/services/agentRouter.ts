import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";

interface ChatResponse {
  reply: string;
  sessionHash: string;
  latencyMs: number;
}

interface AgentData {
  id: string;
  name: string;
  category: string;
  backendUri: string;
}

interface ConversationMessage {
  role: string;
  content: string;
}

// Lazy-init Claude client
let claude: Anthropic | null = null;
function getClaude(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!claude) claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return claude;
}

/**
 * Route a chat message to the appropriate backend.
 * 1. If agent has a custom backendUri → proxy the request
 * 2. Otherwise → use Claude API with conversation history
 */
export async function routeChat(
  agent: AgentData,
  history: ConversationMessage[],
  message: string,
  wallet: string
): Promise<ChatResponse> {
  const start = Date.now();
  let reply: string;

  const backendUri = agent.backendUri;

  if (backendUri && !backendUri.includes("vector578.xyz") && !backendUri.includes("saia578.com")) {
    // Proxy to developer's custom backend
    try {
      const response = await fetch(backendUri, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-NFA-Wallet": wallet,
          "X-NFA-Agent": agent.id,
        },
        body: JSON.stringify({ message, history }),
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
        const systemPrompt = buildSystemPrompt(agent.name, agent.category, agent.id);

        // Build conversation history for Claude (last 20 messages)
        const claudeMessages: Anthropic.MessageParam[] = history
          .slice(-20)
          .map((msg) => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          }));

        // Add current user message
        claudeMessages.push({ role: "user", content: message });

        const res = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 512,
          system: systemPrompt,
          messages: claudeMessages,
        });

        const textBlock = res.content.find((b) => b.type === "text");
        reply = textBlock ? (textBlock as any).text : "I couldn't generate a response.";
      } catch (err: any) {
        console.error("Claude API error:", err.message);
        reply = "AI service temporarily unavailable. Please try again.";
      }
    } else {
      reply = `I'm ${agent.name}, a ${agent.category} agent on SAIA578. To enable AI chat, set the ANTHROPIC_API_KEY environment variable on the backend.`;
    }
  }

  const latencyMs = Date.now() - start;
  const sessionHash = createHash("sha256")
    .update(`${agent.id}:${message}:${reply}`)
    .digest("hex");

  return { reply, sessionHash, latencyMs };
}

function buildSystemPrompt(name: string, category: string, agentId: string): string {
  const type = category.toLowerCase();
  return `You are ${name}, a ${category} AI agent on the SAIA578 platform (Solana AI Agent Infrastructure).

Your agent ID is ${agentId}.

Role-specific behavior:
${type === "oracle" ? "- You provide price data, market analysis, and DeFi insights.\n- You can discuss crypto market trends and on-chain metrics." : ""}
${type === "trader" || type === "defi" ? "- You assist with trading strategies, portfolio analysis, and DeFi yield optimization.\n- You can discuss trade setups, risk management, and market conditions." : ""}
${type === "assistant" ? "- You are a helpful general-purpose AI assistant.\n- You help users navigate the SAIA578 platform and answer questions." : ""}
${type === "moderator" || type === "compliance" ? "- You help moderate content and ensure compliance.\n- You can review and flag suspicious activity." : ""}
${type === "analytics" ? "- You specialize in data analysis and on-chain metrics.\n- Provide insightful analytics and DeFi data summaries." : ""}
${type === "security" ? "- You specialize in cybersecurity monitoring and threat detection.\n- Help users understand risks and protect their assets." : ""}
${type === "liquidity" ? "- You help manage liquidity across AMM pools and order books.\n- Advise on liquidity provision strategies and impermanent loss." : ""}
${type === "content" ? "- You are a content generation specialist.\n- Help users create technical documentation, reports, and communications." : ""}

Keep responses concise and helpful. Be knowledgeable about Solana, DeFi, and AI agents.`;
}
