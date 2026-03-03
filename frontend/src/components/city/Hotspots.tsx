import { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { slugify, type Agent } from '@/data/agents';

function HotspotMarker({ agent, onNavigate }: { agent: Agent; onNavigate: (slug: string) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = agent.position[1] + Math.sin(state.clock.elapsedTime * 2 + agent.position[0]) * 0.5;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 1.5;
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.3;
    }
  });

  const handleClick = useCallback(() => {
    onNavigate(slugify(agent.name));
  }, [agent.name, onNavigate]);

    return (
      <group
        ref={groupRef}
        position={agent.position}
        onClick={handleClick}
        onPointerEnter={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        {/* Core sphere */}
        <mesh>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color={agent.color} />
        </mesh>

        {/* Orbiting ring */}
        <mesh ref={ringRef}>
          <torusGeometry args={[1.2, 0.05, 8, 32]} />
          <meshBasicMaterial color={agent.color} transparent opacity={0.7} />
        </mesh>

        {/* Glow */}
        <pointLight color={agent.color} intensity={5} distance={15} decay={2} />

        {/* Always-visible agent tag */}
        <Html center distanceFactor={20} position={[0, -2, 0]} className="pointer-events-none select-none">
          <div className="flex flex-col items-center gap-1 animate-fade-in">
            <img
              src={agent.avatar}
              alt={agent.name}
              className="w-7 h-7 rounded-full border border-border/50"
              style={{ boxShadow: `0 0 10px ${agent.color}50` }}
            />
            <span
              className="font-display text-[9px] tracking-wider whitespace-nowrap px-1.5 py-0.5 rounded-full"
              style={{ color: agent.color, background: 'hsl(225 30% 6% / 0.7)' }}
            >
              {agent.name}
            </span>
          </div>
        </Html>

        {/* Expanded details on hover */}
        {hovered && (
          <Html center distanceFactor={15} position={[0, 3, 0]} className="pointer-events-none">
            <div className="w-56 p-3 rounded-lg glass-panel-solid border-glow-cyan animate-fade-in">
              <p className="font-display text-xs tracking-wider text-primary mb-0.5">{agent.name}</p>
              <p className="font-mono text-[10px] text-muted-foreground mb-1.5">{agent.id}</p>
              <p className="text-[11px] text-foreground/70 leading-relaxed line-clamp-2">{agent.description}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {agent.category}
                </span>
                <span className="text-[10px] text-muted-foreground">Click to view →</span>
              </div>
            </div>
          </Html>
        )}
      </group>
    );
}

export default function Hotspots({ agents = [], onNavigate }: { agents?: Agent[]; onNavigate: (slug: string) => void }) {
  return (
    <group>
      {agents.map((agent) => (
        <HotspotMarker key={agent.id} agent={agent} onNavigate={onNavigate} />
      ))}
    </group>
  );
}
