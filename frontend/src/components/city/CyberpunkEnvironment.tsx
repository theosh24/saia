import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function NeonLightPole({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, 8, 6]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.3} />
      </mesh>
      <pointLight position={[0, 4, 0]} color={color} intensity={8} distance={20} decay={2} />
      <mesh position={[0, 4, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function FogParticles() {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 500;

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 200;
    positions[i * 3 + 1] = Math.random() * 30;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
  }

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.01;
      const posArr = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        posArr[i * 3 + 1] += Math.sin(state.clock.elapsedTime + i) * 0.005;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#00e5ff" size={0.3} transparent opacity={0.3} sizeAttenuation />
    </points>
  );
}

function Rain() {
  const rainRef = useRef<THREE.Points>(null);
  const count = 2000;

  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 150;
    positions[i * 3 + 1] = Math.random() * 60;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
    velocities[i] = 0.3 + Math.random() * 0.5;
  }

  useFrame(() => {
    if (rainRef.current) {
      const posArr = rainRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        posArr[i * 3 + 1] -= velocities[i];
        if (posArr[i * 3 + 1] < 0) {
          posArr[i * 3 + 1] = 60;
        }
      }
      rainRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={rainRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#4488cc" size={0.08} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

export default function CyberpunkEnvironment() {
  const lightPositions: Array<{ pos: [number, number, number]; color: string }> = [
    { pos: [-15, 0, -15], color: '#00e5ff' },
    { pos: [15, 0, -15], color: '#ff0090' },
    { pos: [-15, 0, 15], color: '#7c4dff' },
    { pos: [15, 0, 15], color: '#00e5ff' },
    { pos: [0, 0, -30], color: '#ff0090' },
    { pos: [0, 0, 30], color: '#7c4dff' },
    { pos: [-30, 0, 0], color: '#00e676' },
    { pos: [30, 0, 0], color: '#ffea00' },
  ];

  return (
    <group>
      {/* Ambient/directional */}
      <ambientLight intensity={0.08} color="#1a1a3e" />
      <directionalLight position={[50, 80, 30]} intensity={0.15} color="#4466aa" />

      {/* Fog */}
      <fog attach="fog" args={['#050510', 20, 150]} />

      {/* Neon light poles */}
      {lightPositions.map((l, i) => (
        <NeonLightPole key={i} position={l.pos} color={l.color} />
      ))}

      {/* Particles & Rain */}
      <FogParticles />
      <Rain />
    </group>
  );
}
