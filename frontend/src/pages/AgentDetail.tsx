import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAgent } from '@/hooks/useAgents';
import { useSendChat } from '@/hooks/useChat';
import {
  ArrowLeft, UserPlus, Flag, Download, CheckCircle, Circle, Copy,
  Loader2, Send, ExternalLink, Shield, Activity, Clock, AlertTriangle,
} from 'lucide-react';
import type { Agent } from '@/data/agents';

const TABS = ['Identity', 'Behavior', 'Reputation', 'Audit', 'Chat'] as const;

export default function AgentDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: agent, isLoading, error } = useAgent(slug);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Identity');
  const navigate = useNavigate();
  const [reported, setReported] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-20 text-center animate-fade-in pointer-events-auto">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground mt-3 text-sm">Loading agent...</p>
      </div>
    );
  }

  if (!agent || error) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-20 text-center animate-fade-in pointer-events-auto">
        <p className="text-muted-foreground">Agent not found.</p>
        <Link to="/agents" className="text-primary text-sm mt-4 inline-block hover:underline">Back to Agents</Link>
      </div>
    );
  }

  const handleExport = () => {
    const data = JSON.stringify(agent, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saia-agent-${agent.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReport = () => {
    setReported(true);
    setTimeout(() => setReported(false), 3000);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 animate-fade-in pointer-events-auto">
      <Link to="/agents" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Agents
      </Link>

      {/* Header card */}
      <div className="glass-panel rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          <div className="relative shrink-0">
            <img src={agent.avatar} alt={agent.name} className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-muted border border-border" />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-card" style={{ backgroundColor: agent.color, boxShadow: `0 0 10px ${agent.color}80` }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">{agent.name}</h1>
              <div className="flex items-center gap-3 md:ml-auto">
                <span className="font-display text-2xl md:text-3xl font-bold text-primary">{agent.evolutions}</span>
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium leading-tight">EVOLUTIONS</span>
              </div>
            </div>
            <p className="font-mono text-xs text-muted-foreground mt-1">{agent.id}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{agent.category}</span>
              <span className="text-xs text-muted-foreground font-mono">Owner: {agent.owner}</span>
              {agent.source === 'on-chain' && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neon-green/10 text-neon-green border border-neon-green/20">On-chain</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5 flex-wrap">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
            <UserPlus className="w-3.5 h-3.5" /> Follow
          </button>
          <button onClick={handleReport} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium glass-panel hover:border-border transition-colors text-muted-foreground">
            <Flag className="w-3.5 h-3.5" /> {reported ? 'Reported' : 'Report'}
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium glass-panel hover:border-border transition-colors text-muted-foreground">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/40 mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab}
              {activeTab === tab && <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-primary to-secondary rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="glass-panel rounded-xl p-6 animate-fade-in">
        {activeTab === 'Identity' && <IdentityTab agent={agent} />}
        {activeTab === 'Behavior' && <BehaviorTab agent={agent} />}
        {activeTab === 'Reputation' && <ReputationTab agent={agent} />}
        {activeTab === 'Audit' && <AuditTab agent={agent} />}
        {activeTab === 'Chat' && <ChatTab agent={agent} />}
      </div>
    </div>
  );
}

// ── Identity Tab ──────────────────────────────────────────────────────────────

function IdentityTab({ agent }: { agent: Agent }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
      <Field label="Category" value={agent.category} />
      <Field label="KYC Level" value={`Level ${agent.kycLevel}`} />
      <Field label="Created" value={new Date(agent.createdAt).toLocaleDateString()} />
      <Field label="Retired" value={agent.retired ? 'Yes' : 'No'} />
      <Field label="Description" value={agent.description} fullWidth />
      <Field label="Tags" value={agent.tags.length ? agent.tags.join(', ') : 'No tags'} />
      <Field label="Backend URI" value={agent.backendUri || 'Not configured'} mono />
      <Field label="Agent ID" value={agent.id} mono copyable />
      {agent.mint && !agent.mint.startsWith('SAIA-') && (
        <>
          <Field label="Mint Address" value={agent.mint} mono copyable />
          <div className="md:col-span-2">
            <a
              href={`https://explorer.solana.com/address/${agent.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              View on Solana Explorer <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </>
      )}
    </div>
  );
}

// ── Behavior Tab ──────────────────────────────────────────────────────────────

function BehaviorTab({ agent }: { agent: Agent }) {
  const behaviors = [
    { icon: Activity, label: 'Agent Type', value: agent.category, color: 'text-primary' },
    { icon: Shield, label: 'KYC Compliance', value: agent.kycLevel > 0 ? `Level ${agent.kycLevel} verified` : 'Not verified', color: agent.kycLevel > 0 ? 'text-neon-green' : 'text-muted-foreground' },
    { icon: Clock, label: 'Response Mode', value: agent.backendUri ? 'Custom backend' : 'Default AI (Claude)', color: 'text-primary' },
    { icon: AlertTriangle, label: 'Status', value: agent.retired ? 'Retired' : 'Active', color: agent.retired ? 'text-red-400' : 'text-neon-green' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {behaviors.map((b, i) => (
          <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/20 border border-border/30">
            <b.icon className={`w-5 h-5 shrink-0 mt-0.5 ${b.color}`} />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{b.label}</p>
              <p className={`text-sm font-medium mt-0.5 ${b.color}`}>{b.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Capabilities</p>
        <div className="flex flex-wrap gap-2">
          {agent.tags.length > 0 ? agent.tags.map((tag) => (
            <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{tag}</span>
          )) : (
            <span className="text-xs text-muted-foreground">No capabilities tags defined</span>
          )}
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Evolution History</p>
        <p className="text-sm text-foreground">
          {agent.evolutions > 0
            ? `This agent has evolved ${agent.evolutions} time${agent.evolutions > 1 ? 's' : ''}. Each evolution represents an on-chain state update.`
            : 'This agent has not evolved yet. Evolution occurs when the agent state is updated on-chain.'}
        </p>
      </div>
    </div>
  );
}

// ── Reputation Tab ────────────────────────────────────────────────────────────

function ReputationTab({ agent }: { agent: Agent }) {
  const score = Math.round(agent.reputationScore * 10) / 10;
  const barWidth = Math.min(score, 100);

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3">
        <span className="font-display text-4xl font-bold text-primary">{score}</span>
        <span className="text-sm text-muted-foreground mb-1">/ 100</span>
      </div>

      <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style={{ width: `${barWidth}%` }} />
      </div>

      <div className="flex items-center gap-2">
        {agent.verified ? (
          <span className="flex items-center gap-1.5 text-sm text-neon-green font-medium">
            <CheckCircle className="w-4 h-4" /> Verified Agent
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Circle className="w-4 h-4" /> Unverified
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <StatCard label="Evolutions" value={String(agent.evolutions)} />
        <StatCard label="KYC Level" value={String(agent.kycLevel)} />
        <StatCard label="Tags" value={String(agent.tags.length)} />
        <StatCard label="Status" value={agent.retired ? 'Retired' : 'Active'} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/20 border border-border/30 text-center">
      <p className="font-display text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

// ── Audit Tab ─────────────────────────────────────────────────────────────────

function AuditTab({ agent }: { agent: Agent }) {
  const hasOnChainMint = agent.mint && !agent.mint.startsWith('SAIA-');
  const events = [
    { time: agent.createdAt, action: 'Agent Registered', detail: `Registered as ${agent.category} agent on SAIA578` },
    ...(agent.evolutions > 0 ? [{ time: agent.createdAt, action: 'State Evolution', detail: `${agent.evolutions} evolution(s) recorded` }] : []),
    ...(agent.verified ? [{ time: agent.createdAt, action: 'Verification', detail: 'Agent identity verified' }] : []),
    ...(hasOnChainMint ? [{ time: agent.createdAt, action: 'NFT Certificate Minted', detail: `On-chain: ${agent.mint.slice(0, 16)}...` }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Activity Log</p>
        {hasOnChainMint && (
          <a
            href={`https://explorer.solana.com/address/${agent.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View on Explorer <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <div className="space-y-3">
        {events.map((e, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{e.action}</p>
                <p className="text-[10px] text-muted-foreground font-mono shrink-0">{new Date(e.time).toLocaleDateString()}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{e.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 space-y-2 text-xs">
        <Field label="Agent ID" value={agent.id} mono copyable />
        {hasOnChainMint && <Field label="Mint Address" value={agent.mint} mono copyable />}
      </div>
    </div>
  );
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────

interface Message { role: 'user' | 'agent'; text: string; }

function ChatTab({ agent }: { agent: Agent }) {
  const chatMutation = useSendChat();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'agent', text: `Hello! I am ${agent.name}, your ${agent.category} agent. How can I assist you?` },
  ]);
  const [input, setInput] = useState('');
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setInput('');

    try {
      const res = await chatMutation.mutateAsync({ agentId: agent.id, message: userMsg, sessionId });
      setMessages((prev) => [...prev, { role: 'agent', text: res.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'agent', text: 'Error communicating with agent. Please try again.' }]);
    }
  };

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary/15 border border-primary/20 text-foreground'
                : 'bg-secondary/10 border border-secondary/20 text-foreground'
            }`}>
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

      <div className="flex items-center gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={`Message ${agent.name}...`}
          className="flex-1 px-4 py-3 rounded-xl glass-panel text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-body"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || chatMutation.isPending}
          className="w-11 h-11 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Shared Field ──────────────────────────────────────────────────────────────

function Field({ label, value, mono, fullWidth, copyable }: {
  label: string; value: string; mono?: boolean; fullWidth?: boolean; copyable?: boolean;
}) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`text-sm text-foreground ${mono ? 'font-mono text-xs break-all' : ''}`}>{value || 'N/A'}</p>
        {copyable && value && (
          <button onClick={() => navigator.clipboard.writeText(value)} className="text-muted-foreground hover:text-primary transition-colors shrink-0">
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
