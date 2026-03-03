import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import ProceduralBuildings from './ProceduralBuildings';
import CyberpunkEnvironment from './CyberpunkEnvironment';
import type { Agent } from '@/data/agents';

interface Props {
  agents?: Agent[];
  onAgentNavigate?: (slug: string) => void;
}

export default function CyberpunkScene({ agents = [], onAgentNavigate }: Props) {
  const handleNavigate = (slug: string) => {
    onAgentNavigate?.(slug);
  };

  return (
    <Canvas
      camera={{ position: [0, 50, 90], fov: 60, near: 0.1, far: 500 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 1.5]}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#050510']} />

      <Stars radius={200} depth={100} count={3000} factor={4} saturation={0.5} fade speed={0.5} />

      <CyberpunkEnvironment />
      <ProceduralBuildings agents={agents} onNavigate={handleNavigate} />

      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={[0.001, 0.001] as any}
          radialModulation={false}
          modulationOffset={0}
        />
      </EffectComposer>

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        maxPolarAngle={Math.PI / 2.1}
        minDistance={5}
        maxDistance={100}
        autoRotate
        autoRotateSpeed={0.3}
        target={[0, 5, 0]}
      />
    </Canvas>
  );
}
