"use client";

import { Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";

/**
 * A single faint, sparse star layer — just enough to give the dark backdrop a
 * sense of depth behind the web. Intentionally subtle (not a galaxy field).
 */
export function Starfield() {
  const group = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.004;
  });

  return (
    <group ref={group}>
      <Stars radius={140} depth={60} count={1200} factor={2.4} saturation={0} fade speed={0.1} />
    </group>
  );
}
