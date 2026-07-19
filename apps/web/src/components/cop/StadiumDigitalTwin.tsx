/* eslint-disable */
// @ts-nocheck
/// <reference types="@react-three/fiber" />
import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import type * as THREE from "three";

function StadiumModel({ progress }: { progress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Slow constant spin, with delta control from scroll progress
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05 + progress * Math.PI * 1.5;
      groupRef.current.position.y = -1.0 + progress * 0.3;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -state.clock.getElapsedTime() * 0.1;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z = state.clock.getElapsedTime() * 0.08;
    }
  });

  const particlePositions = React.useMemo(() => {
    return new Float32Array(
      Array.from({ length: 450 }, (_, i) => {
        const angle = (i / 450) * Math.PI * 2 + Math.random() * 0.15;
        const radius = 4.2 + Math.random() * 1.2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (Math.random() - 0.5) * 1.2;
        return [x, y, z];
      }).flat()
    );
  }, []);

  return (
    <group ref={groupRef}>
      {/* Stadium Inner Ring / Wireframe */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[4.5, 0.25, 8, 36]} />
        <meshBasicMaterial color="#00ffcc" wireframe opacity={0.25} transparent />
      </mesh>

      {/* Stadium Outer Ring / Wireframe */}
      <mesh ref={ringRef2} rotation={[Math.PI / 2, 0.1, 0]} position={[0, 0.6, 0]}>
        <torusGeometry args={[5.5, 0.15, 6, 48]} />
        <meshBasicMaterial color="#d4af37" wireframe opacity={0.18} transparent />
      </mesh>

      {/* Floating Crowd Flow Particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              particlePositions,
              3
            ]}
          />
        </bufferGeometry>
        <pointsMaterial size={0.07} color="#00ffcc" transparent opacity={0.7} />
      </points>

      {/* Active Spotlights (stadium lights) */}
      <spotLight position={[4, 6, 4]} angle={0.25} penumbra={1} intensity={3} color="#00ffcc" />
      <spotLight position={[-4, 6, -4]} angle={0.25} penumbra={1} intensity={3} color="#d4af37" />
    </group>
  );
}

export default function StadiumDigitalTwin({ progress }: { progress: number }) {
  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, zIndex: 1, pointerEvents: "none" }}>
      <Canvas camera={{ position: [0, 3, 9], fov: 50 }} dpr={[1, 2]} performance={{ min: 0.5 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[8, 8, 8]} intensity={1.2} />
        <StadiumModel progress={progress} />
        <Stars radius={90} depth={40} count={1200} factor={3} saturation={0.5} fade speed={1.2} />
      </Canvas>
    </div>
  );
}
