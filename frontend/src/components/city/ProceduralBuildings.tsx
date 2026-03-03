import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { slugify, type Agent } from '@/data/agents';

interface BuildingData {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  emissiveColor: string;
  emissiveIntensity: number;
  hasNeonStripes: boolean;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateBuildings(count: number, radius: number): BuildingData[] {
  const buildings: BuildingData[] = [];
  const neonColors = ['#00e5ff', '#ff0090', '#7c4dff', '#ffea00', '#00e676'];

  for (let i = 0; i < count; i++) {
    const seed = i * 137.5;
    const angle = seededRandom(seed) * Math.PI * 2;
    const dist = 10 + seededRandom(seed + 1) * radius;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    const width = 2 + seededRandom(seed + 2) * 4;
    const height = 5 + seededRandom(seed + 3) * 35;
    const depth = 2 + seededRandom(seed + 4) * 4;

    const colorIdx = Math.floor(seededRandom(seed + 5) * neonColors.length);

    buildings.push({
      position: [x, height / 2, z],
      scale: [width, height, depth],
      color: '#0a0a1a',
      emissiveColor: neonColors[colorIdx],
      emissiveIntensity: 0.3 + seededRandom(seed + 6) * 0.5,
      hasNeonStripes: seededRandom(seed + 7) > 0.4,
    });
  }
  return buildings;
}

function NeonBuilding({ data }: { data: BuildingData }) {
  return (
    <group position={data.position}>
      <mesh>
        <boxGeometry args={data.scale} />
        <meshStandardMaterial color={data.color} roughness={0.7} metalness={0.3} />
      </mesh>
      {data.hasNeonStripes && (
        <>
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(...data.scale)]} />
            <lineBasicMaterial color={data.emissiveColor} transparent opacity={0.6} />
          </lineSegments>
          {Array.from({ length: Math.floor(data.scale[1] / 3) }).map((_, i) => (
            <mesh key={i} position={[0, -data.scale[1] / 2 + i * 3 + 1.5, data.scale[2] / 2 + 0.01]}>
              <planeGeometry args={[data.scale[0] * 0.8, 0.3]} />
              <meshBasicMaterial color={data.emissiveColor} transparent opacity={0.4 + Math.random() * 0.4} />
            </mesh>
          ))}
        </>
      )}
      {data.emissiveIntensity > 0.5 && (
        <mesh position={[0, data.scale[1] / 2 + 1, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 2, 4]} />
          <meshBasicMaterial color={data.emissiveColor} />
        </mesh>
      )}
    </group>
  );
}

function AgentBuilding({ agent, onNavigate }: { agent: Agent; onNavigate: (slug: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.PointLight>(null);
  const antennaRef = useRef<THREE.Mesh>(null);

  const height = 15 + agent.reputationScore * 0.3;
  const width = 4;
  const depth = 4;
  const pos: [number, number, number] = [agent.position[0], height / 2, agent.position[2]];

  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.intensity = hovered ? 15 : 8 + Math.sin(state.clock.elapsedTime * 2 + agent.position[0]) * 3;
    }
    if (antennaRef.current) {
      antennaRef.current.rotation.y = state.clock.elapsedTime * 2;
    }
  });

  const handleClick = useCallback(() => {
    onNavigate(slugify(agent.name));
  }, [agent.name, onNavigate]);

  return (
    <group
      position={pos}
      onClick={handleClick}
      onPointerEnter={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      {/* Main tower */}
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={hovered ? '#1a1a3e' : '#0a0a1a'}
          emissive={agent.color}
          emissiveIntensity={hovered ? 0.4 : 0.05}
          roughness={0.5}
          metalness={0.5}
        />
      </mesh>

      {/* Neon edges */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial color={agent.color} transparent opacity={hovered ? 1 : 0.7} />
      </lineSegments>

      {/* Window strips colored by agent */}
      {Array.from({ length: Math.floor(height / 2.5) }).map((_, i) => (
        <mesh key={i} position={[0, -height / 2 + i * 2.5 + 1.2, depth / 2 + 0.02]}>
          <planeGeometry args={[width * 0.85, 0.4]} />
          <meshBasicMaterial color={agent.color} transparent opacity={hovered ? 0.9 : 0.5} />
        </mesh>
      ))}

      {/* Rooftop beacon */}
      <mesh ref={antennaRef} position={[0, height / 2 + 1.5, 0]}>
        <octahedronGeometry args={[0.8, 0]} />
        <meshBasicMaterial color={agent.color} />
      </mesh>

      {/* Glow light */}
      <pointLight ref={glowRef} color={agent.color} intensity={8} distance={25} decay={2} position={[0, height / 2 + 2, 0]} />

      {/* Agent label — always visible */}
      <Html center distanceFactor={25} position={[0, height / 2 + 5, 0]} className="pointer-events-none select-none">
        <div className="flex flex-col items-center gap-1 animate-fade-in">
          <img
            src={agent.avatar}
            alt={agent.name}
            className="w-8 h-8 rounded-full border-2"
            style={{ borderColor: agent.color, boxShadow: `0 0 12px ${agent.color}60` }}
          />
          <span
            className="font-display text-[10px] tracking-wider whitespace-nowrap px-2 py-0.5 rounded-full"
            style={{ color: agent.color, background: 'hsl(225 30% 6% / 0.85)' }}
          >
            {agent.name}
          </span>
        </div>
      </Html>

      {/* Hover details */}
      {hovered && (
        <Html center distanceFactor={18} position={[0, height / 2 + 12, 0]} className="pointer-events-none">
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

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[500, 500]} />
      <meshStandardMaterial color="#050510" roughness={0.9} metalness={0.1} />
    </mesh>
  );
}

function GridFloor() {
  const gridRef = useRef<THREE.GridHelper>(null);

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.material.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <gridHelper
      ref={gridRef as any}
      args={[500, 100, '#00e5ff', '#1a1a3e']}
      position={[0, 0.01, 0]}
    />
  );
}

interface ProceduralBuildingsProps {
  agents?: Agent[];
  onNavigate?: (slug: string) => void;
}

export default function ProceduralBuildings({ agents = [], onNavigate }: ProceduralBuildingsProps) {
  const buildings = useMemo(() => generateBuildings(100, 80), []);

  const handleNavigate = useCallback((slug: string) => {
    onNavigate?.(slug);
  }, [onNavigate]);

  return (
    <group>
      <Ground />
      <GridFloor />
      {buildings.map((b, i) => (
        <NeonBuilding key={i} data={b} />
      ))}
      {agents.map((agent) => (
        <AgentBuilding key={agent.id} agent={agent} onNavigate={handleNavigate} />
      ))}
    </group>
  );
}
