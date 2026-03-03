import { useState, useRef, useEffect } from 'react';
import { Send, Lock, Loader2 } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAgents } from '@/hooks/useAgents';
import { useSendChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { slugify, FALLBACK_AGENTS } from '@/data/agents';
import type { Agent } from '@/data/agents';

interface Message {
  role: 'user' | 'agent';
  text: string;
}

export default function Chat() {
  const { connected } = useWallet();
  const { data } = useAgents(0, 100);
  const agents = data?.agents?.length ? data.agents : FALLBACK_AGENTS;
  const { isAuthenticated, authenticate, loading: authLoading, error: authError } = useAuth();
  const chatMutation = useSendChat();

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const messagesEnd = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Select first agent by default
  useEffect(() => {
    if (agents.length && !selectedAgent) {
      setSelectedAgent(agents[0]);
      setMessages([{
        role: 'agent',
        text: `Hello! I am ${agents[0].name}, your ${agents[0].category} agent. How can I assist you today?`,
      }]);
    }
  }, [agents, selectedAgent]);

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setMessages([{
      role: 'agent',
      text: `Hello! I am ${agent.name}, your ${agent.category} agent. How can I assist you today?`,
    }]);
  };

  const handleAuth = async () => {
    await authenticate();
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setInput('');

    try {
      const res = await chatMutation.mutateAsync({
        agentId: selectedAgent.id,
        message: userMsg,
        sessionId,
      });
      setMessages((prev) => [...prev, { role: 'agent', text: res.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'agent', text: 'Error communicating with agent. Please try again.' },
      ]);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-10 animate-fade-in flex flex-col h-[calc(100vh-4rem)] pointer-events-auto">
      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-4">Agent Chat</h2>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Agent selector sidebar */}
        <div className="w-48 shrink-0 glass-panel rounded-xl p-3 overflow-y-auto hidden md:block">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Select Agent</p>
          <div className="space-y-1">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleSelectAgent(agent)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                  selectedAgent?.id === agent.id
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                <img src={agent.avatar} alt={agent.name} className="w-6 h-6 rounded-full" />
                <span className="text-xs font-medium truncate">{agent.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Auth bar */}
          {connected && !isAuthenticated && selectedAgent && (
            <div className="glass-panel rounded-lg px-4 py-2 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="w-3.5 h-3.5" />
                <span>Authenticate to chat with real agent backend</span>
              </div>
              <button
                onClick={handleAuth}
                disabled={authLoading}
                className="px-3 py-1 rounded-md text-xs font-medium bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors disabled:opacity-50"
              >
                {authLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Sign & Verify'}
              </button>
            </div>
          )}
          {authError && (
            <p className="text-xs text-red-400 mb-2">{authError}</p>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto glass-panel rounded-xl p-4 md:p-6 space-y-4 mb-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary/15 border border-primary/20 text-foreground'
                      : 'bg-secondary/10 border border-secondary/20 text-foreground'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5 rounded-xl bg-secondary/10 border border-secondary/20">
                  <Loader2 className="w-4 h-4 animate-spin text-secondary" />
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={selectedAgent ? `Message ${selectedAgent.name}…` : 'Select an agent…'}
              disabled={!selectedAgent}
              className="flex-1 px-4 py-3 rounded-xl glass-panel text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-body disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !selectedAgent}
              className="w-11 h-11 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
