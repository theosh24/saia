import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAgent } from '@/hooks/useAgents';
import { ArrowLeft, UserPlus, Flag, Download, CheckCircle, Circle, Copy, Loader2 } from 'lucide-react';
import type { Agent } from '@/data/agents';

const TABS = ['Identity', 'Behavior', 'Reputation', 'Audit', 'Chat'] as const;

export default function AgentDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: agent, isLoading, error } = useAgent(slug);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Identity');

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-20 text-center animate-fade-in pointer-events-auto">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground mt-3 text-sm">Loading agent…</p>
      </div>
    );
  }

  if (!agent || error) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-20 text-center animate-fade-in pointer-events-auto">
        <p className="text-muted-foreground">Agent not found.</p>
        <Link to="/agents" className="text-primary text-sm mt-4 inline-block hover:underline">← Back to Agents</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 animate-fade-in pointer-events-auto">
      {/* Back */}
      <Link to="/agents" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Agents
      </Link>

      {/* Header card */}
      <div className="glass-panel rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <img
              src={agent.avatar}
              alt={agent.name}
              className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-muted border border-border"
            />
            <span
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-card"
              style={{ backgroundColor: agent.color, boxShadow: `0 0 10px ${agent.color}80` }}
            />
          </div>

          {/* Info */}
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
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {agent.category}
              </span>
              <span className="text-xs text-muted-foreground font-mono">Owner: {agent.owner}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-5 flex-wrap">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
            <UserPlus className="w-3.5 h-3.5" /> Follow
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium glass-panel hover:border-border transition-colors text-muted-foreground">
            <Flag className="w-3.5 h-3.5" /> Report
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium glass-panel hover:border-border transition-colors text-muted-foreground">
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
              className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-primary to-secondary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="glass-panel rounded-xl p-6 animate-fade-in">
        {activeTab === 'Identity' && <IdentityTab agent={agent} />}
        {activeTab === 'Behavior' && <PlaceholderTab label="Behavior analytics coming soon." />}
        {activeTab === 'Reputation' && <ReputationTab agent={agent} />}
        {activeTab === 'Audit' && <PlaceholderTab label="Audit trail coming soon." />}
        {activeTab === 'Chat' && <PlaceholderTab label="Agent chat interface coming soon." />}
      </div>
    </div>
  );
}

function IdentityTab({ agent }: { agent: Agent }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
      <Field label="Category" value={agent.category} />
      <Field label="KYC Level" value={String(agent.kycLevel)} />
      <Field label="Created" value={agent.createdAt} />
      <Field label="Retired" value={agent.retired ? 'Yes' : 'No'} />
      <Field label="Description" value={agent.description} fullWidth />
      <Field label="Tags" value={agent.tags.length ? agent.tags.join(', ') : 'No tags'} />
      <Field label="Backend URI" value={agent.backendUri} mono />
      <Field label="Logic Contract" value={agent.logicContract} mono copyable />
      <Field label="Mint" value={agent.mint} mono copyable />
    </div>
  );
}

function ReputationTab({ agent }: { agent: Agent }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="font-display text-3xl font-bold text-primary">{agent.reputationScore}</span>
        <span className="text-sm text-muted-foreground">/ 100</span>
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
    </div>
  );
}

function Field({ label, value, mono, fullWidth, copyable }: {
  label: string; value: string; mono?: boolean; fullWidth?: boolean; copyable?: boolean;
}) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`text-sm text-foreground ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</p>
        {copyable && (
          <button
            onClick={() => navigator.clipboard.writeText(value)}
            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function PlaceholderTab({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground py-8 text-center">{label}</p>;
}
