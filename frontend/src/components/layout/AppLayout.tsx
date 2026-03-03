import { Outlet, useNavigate } from 'react-router-dom';
import { Suspense, useCallback } from 'react';
import Navbar from './Navbar';
import CyberpunkScene from '@/components/city/CyberpunkScene';
import { useAgents } from '@/hooks/useAgents';
import { FALLBACK_AGENTS } from '@/data/agents';

export default function AppLayout() {
  const navigate = useNavigate();
  const { data } = useAgents(0, 100);

  const agents = data?.agents?.length ? data.agents : FALLBACK_AGENTS;

  const handleAgentNavigate = useCallback((slug: string) => {
    navigate(`/agents/${slug}`);
  }, [navigate]);

  return (
    <div className="relative min-h-screen noise-overlay">
      {/* Layer 1: 3D Background — interactive */}
      <div className="fixed inset-0 z-0">
        <Suspense fallback={null}>
          <CyberpunkScene agents={agents} onAgentNavigate={handleAgentNavigate} />
        </Suspense>
      </div>

      {/* Layer 2: Dark gradient overlay */}
      <div className="fixed inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(180deg,
              hsl(225 30% 6% / 0.65) 0%,
              hsl(225 30% 6% / 0.45) 30%,
              hsl(225 30% 6% / 0.55) 70%,
              hsl(225 30% 6% / 0.8) 100%
            )
          `
        }}
      />

      {/* Layer 3: UI */}
      <div className="relative z-20 min-h-screen flex flex-col pointer-events-none">
        <div className="pointer-events-auto">
          <Navbar />
        </div>
        <main className="flex-1 pt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
