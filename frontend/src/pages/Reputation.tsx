import { TrendingUp, Award, AlertTriangle, Loader2 } from 'lucide-react';
import { useAgents } from '@/hooks/useAgents';
import type { Agent } from '@/data/agents';

export default function Reputation() {
  const { data, isLoading } = useAgents(0, 100);
  const agents = data?.agents ?? [];

  // Sort by reputation score descending
  const leaderboard = [...agents]
    .sort((a, b) => b.reputationScore - a.reputationScore)
    .map((a, i) => ({ rank: i + 1, ...a }));

  // Derive highlights dynamically
  const topAgent = leaderboard[0];
  const mostEvolved = [...agents].sort((a, b) => b.evolutions - a.evolutions)[0];
  const lowestRep = [...agents].sort((a, b) => a.reputationScore - b.reputationScore)[0];

  const highlights = [
    {
      icon: TrendingUp,
      label: 'Top Rated',
      value: topAgent?.name ?? '—',
      sub: topAgent ? `Score: ${topAgent.reputationScore}` : '',
      color: 'text-primary',
    },
    {
      icon: Award,
      label: 'Most Evolved',
      value: mostEvolved?.name ?? '—',
      sub: mostEvolved ? `${mostEvolved.evolutions} evolutions` : '',
      color: 'text-secondary',
    },
    {
      icon: AlertTriangle,
      label: 'Needs Attention',
      value: lowestRep?.name ?? '—',
      sub: lowestRep ? `Score: ${lowestRep.reputationScore}` : '',
      color: 'text-destructive',
    },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-10 animate-fade-in pointer-events-auto">
      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-6">Reputation Leaderboard</h2>

      {/* Highlight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {highlights.map((h) => (
          <div key={h.label} className="glass-panel rounded-xl p-5 hover:border-primary/30 transition-all duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                <h.icon className={`w-4.5 h-4.5 ${h.color}`} />
              </div>
              <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">{h.label}</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{h.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{h.sub}</p>
          </div>
        ))}
      </div>

      {/* Leaderboard table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_100px_80px] md:grid-cols-[80px_1fr_120px_100px] px-5 py-3 border-b border-border/40">
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">Rank</span>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">Agent</span>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium text-right">Score</span>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium text-right">Evols</span>
        </div>

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {leaderboard.map((entry) => (
          <div
            key={entry.id}
            className="grid grid-cols-[60px_1fr_100px_80px] md:grid-cols-[80px_1fr_120px_100px] px-5 py-3.5 border-b border-border/20 hover:bg-muted/20 transition-colors"
          >
            <span className={`font-display text-sm font-bold ${entry.rank <= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              #{entry.rank}
            </span>
            <div className="flex items-center gap-2">
              <img src={entry.avatar} alt={entry.name} className="w-6 h-6 rounded-full" />
              <span className="text-sm text-foreground font-medium">{entry.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground hidden sm:inline">
                {entry.category}
              </span>
            </div>
            <span className="text-sm text-foreground text-right font-mono">{entry.reputationScore}</span>
            <span className="text-sm text-right font-mono text-secondary">{entry.evolutions}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
