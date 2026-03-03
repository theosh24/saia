import { useState } from 'react';
import { Search, CheckCircle, Circle, Map, List, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAgents } from '@/hooks/useAgents';
import { slugify, FALLBACK_AGENTS } from '@/data/agents';

export default function Agents() {
  const [view, setView] = useState<'map' | 'list'>('map');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAgents(0, 100);

  const agents = data?.agents?.length ? data.agents : FALLBACK_AGENTS;

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.owner.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 pt-16 z-20 flex flex-col pointer-events-none">
      {/* Top control bar */}
      <div className="pointer-events-auto px-4 py-3 flex items-center gap-3 max-w-[1200px] mx-auto w-full">
        {/* View toggle */}
        <div className="flex items-center glass-panel rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => setView('map')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              view === 'map' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Map className="w-3.5 h-3.5" /> Map
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              view === 'list' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents…"
            className="w-full pl-9 pr-4 py-2 rounded-lg glass-panel text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-body"
          />
        </div>

        <span className="text-[11px] text-muted-foreground font-mono shrink-0 hidden sm:block">
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : `${filtered.length} agents`}
        </span>
      </div>

      {view === 'map' ? (
        /* MAP VIEW — transparent pass-through, 3D scene is behind */
        <div className="flex-1 relative">
          {/* Instruction hint */}
          <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2">
            <div className="glass-panel-solid rounded-xl px-6 py-3 text-sm text-muted-foreground font-mono">
              <span className="text-primary font-bold">CLICK</span> on agents to view details · <span className="text-primary font-bold">DRAG</span> to orbit · <span className="text-primary font-bold">SCROLL</span> to zoom
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="flex-1 overflow-y-auto pointer-events-auto px-4 pb-6">
          <div className="max-w-[1200px] mx-auto space-y-2 animate-fade-in">
            {filtered.map((agent) => (
              <Link
                key={agent.id}
                to={`/agents/${slugify(agent.name)}`}
                className="glass-panel rounded-xl px-4 py-3 flex items-center gap-4 group hover:border-primary/40 transition-all duration-200 cursor-pointer block"
              >
                {/* Avatar with color indicator */}
                <div className="relative shrink-0">
                  <img
                    src={agent.avatar}
                    alt={agent.name}
                    className="w-10 h-10 rounded-full bg-muted border border-border"
                  />
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card"
                    style={{ backgroundColor: agent.color, boxShadow: `0 0 8px ${agent.color}60` }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">{agent.category} · {agent.id}</p>
                </div>

                {/* Score */}
                <span className="text-sm font-display font-bold text-primary hidden sm:block">
                  {agent.reputationScore}
                </span>

                {/* Status */}
                {agent.verified ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-neon-green">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Verified</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Circle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Unverified</span>
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
