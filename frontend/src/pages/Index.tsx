import { Search, Shield, Bot, BarChart3, FileCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAgents } from '@/hooks/useAgents';

export default function Index() {
  const { data } = useAgents(0, 100);

  const agents = data?.agents ?? [];
  const totalAgents = data?.total ?? 0;
  const verified = agents.filter((a) => a.verified).length;
  const avgRep = agents.length
    ? (agents.reduce((sum, a) => sum + a.reputationScore, 0) / agents.length).toFixed(1)
    : '—';
  const totalEvolutions = agents.reduce((sum, a) => sum + a.evolutions, 0);

  const stats = [
    { icon: Bot, label: 'ACTIVE AGENTS', value: String(totalAgents), color: 'text-primary' },
    { icon: Shield, label: 'VERIFIED IDS', value: String(verified), color: 'text-secondary' },
    { icon: BarChart3, label: 'REPUTATION SCORE AVG', value: avgRep, color: 'text-primary' },
    { icon: FileCheck, label: 'TOTAL EVOLUTIONS', value: String(totalEvolutions), color: 'text-secondary' },
  ];

  return (
    <div className="animate-fade-in pointer-events-none">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-24 pb-16 md:pt-36 md:pb-24">
        <div className="max-w-[720px] mx-auto space-y-6">
          <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              First AI Agent NFT
            </span>
            <br />
            <span className="text-foreground">on Solana</span>
          </h1>

          <p className="text-muted-foreground text-base md:text-lg max-w-[520px] mx-auto leading-relaxed font-body">
            Powered by <span className="text-primary font-medium">SPL-578</span> — The Non-Fungible Agent Standard
          </p>

          <div className="flex items-center justify-center pt-2 pointer-events-auto">
            <Link
              to="/agents"
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Explore Agents
            </Link>
          </div>
        </div>

        {/* Neon divider */}
        <div className="neon-divider w-64 md:w-96 mt-16" />
      </section>

      {/* Dashboard Cards */}
      <section className="max-w-[1200px] mx-auto px-4 pb-20 pointer-events-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass-panel rounded-xl p-5 group hover:border-primary/40 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                  <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                </div>
              </div>
              <p className={`text-2xl md:text-3xl font-bold font-display ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mt-1.5 font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
