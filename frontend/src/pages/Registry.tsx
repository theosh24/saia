import { FileCheck, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAgents } from '@/hooks/useAgents';
import { slugify } from '@/data/agents';

export default function Registry() {
  const { data, isLoading } = useAgents(0, 100);
  const agents = data?.agents ?? [];

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-10 animate-fade-in pointer-events-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">Agent Registry</h2>
        <Link
          to="/issue-id"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Register Agent
        </Link>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_100px_100px_60px] px-5 py-3 border-b border-border/40 hidden md:grid">
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">ID / Agent</span>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">Type</span>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">Date</span>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">Status</span>
          <span />
        </div>

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {agents.map((a) => {
          const status = a.retired ? 'Retired' : a.verified ? 'Active' : 'Pending';
          return (
            <Link
              key={a.id}
              to={`/agents/${slugify(a.name)}`}
              className="grid grid-cols-1 md:grid-cols-[1fr_1fr_100px_100px_60px] px-5 py-4 border-b border-border/20 hover:bg-muted/20 transition-colors gap-1 md:gap-0"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{a.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{a.id}</p>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground">{a.category}</span>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-muted-foreground font-mono">
                  {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="flex items-center">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  status === 'Active'
                    ? 'bg-neon-green/10 text-neon-green border border-neon-green/20'
                    : status === 'Retired'
                    ? 'bg-destructive/10 text-destructive border border-destructive/20'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}>
                  {status}
                </span>
              </div>
              <div className="flex items-center justify-end">
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
