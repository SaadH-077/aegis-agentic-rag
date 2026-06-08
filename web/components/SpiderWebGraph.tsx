"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

import { CameraRig } from "./CameraRig";
import { GraphScene } from "./GraphScene";
import { WebBackdrop } from "./WebBackdrop";

interface Props {
  visited: string[];
  activeNode: string | null;
  onSelect: (id: string) => void;
}

// Light "game screen" theme: the canvas is transparent so the CSS grid/halftone
// shows through, and the spider-web + nodes render as crisp black/red comic art
// on top (no additive glow or bloom — those need a dark backdrop).
const BG = "#eef1f6";

/** Full 3D scene. Default-exported for dynamic import with ssr:false. */
export default function SpiderWebGraph({ visited, activeNode, onSelect }: Props) {
  return (
    <Canvas camera={{ position: [2, 3.5, 33], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <fog attach="fog" args={[BG, 50, 120]} />

      <ambientLight intensity={0.95} />
      <directionalLight position={[6, 12, 16]} intensity={0.6} color="#ffffff" />

      <Suspense fallback={null}>
        <WebBackdrop activeNode={activeNode} />
        <GraphScene visited={visited} activeNode={activeNode} onSelect={onSelect} />
      </Suspense>

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={9}
        maxDistance={48}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.82}
      />
      <CameraRig activeNode={activeNode} />
    </Canvas>
  );
}
