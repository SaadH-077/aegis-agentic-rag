"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { glowSprite } from "@/lib/sprites";

// The hero: a luminous orb-weaver web that frames the reasoning graph. Threads
// glow brightest at the core and fade into the dark toward the rim (encoded in
// vertex colors, so it reads on the near-black background without per-vertex
// alpha). Dew-drop highlights sit on the strands; the whole web breathes and
// shimmers, and pulses a little brighter while the agent is thinking.

const SPOKES = 18;
const RINGS = [2.4, 4.8, 7.4, 10.1, 12.9, 15.6, 18.2];
const R = RINGS[RINGS.length - 1];

const INK = new THREE.Color("#14151a"); // black strands
const BG = new THREE.Color("#eef1f6"); // light background they fade into

const zAt = (r: number) => 1.6 * (1 - r / R); // gentle dome toward the camera
const spokeJitter = (s: number) => 1 + 0.05 * Math.sin(s * 2.3); // organic irregularity

function point(s: number, r: number): [number, number, number] {
  const ang = (s / SPOKES) * Math.PI * 2;
  const rr = r * spokeJitter(s);
  return [Math.cos(ang) * rr, Math.sin(ang) * rr, zAt(rr)];
}

/** Brightness + brand-tinted color for a strand vertex at radius rr. */
function strandColor(rr: number): THREE.Color {
  // black near the core, fading into the light background toward the rim
  const t = Math.min((rr / R) * 1.05, 1);
  return INK.clone().lerp(BG, t);
}

function buildWeb(): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const push = (p: [number, number, number], r: number) => {
    pos.push(p[0], p[1], p[2]);
    const c = strandColor(r);
    col.push(c.r, c.g, c.b);
  };

  // radial spokes (center → out, segmented at each ring so colors grade)
  const center: [number, number, number] = [0, 0, zAt(0)];
  for (let s = 0; s < SPOKES; s++) {
    let prev = center;
    let prevR = 0;
    for (const r of RINGS) {
      const p = point(s, r);
      push(prev, prevR);
      push(p, r);
      prev = p;
      prevR = r;
    }
  }
  // concentric rings (polygon edges between neighbouring spokes)
  for (const r of RINGS) {
    for (let s = 0; s < SPOKES; s++) {
      push(point(s, r), r);
      push(point((s + 1) % SPOKES, r), r);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return geo;
}

// Dew drops on inner/mid strands (skip the faint rim) — every third spoke.
const DEW: [number, number, number][] = [];
for (let i = 1; i <= 4; i++) {
  for (let s = 0; s < SPOKES; s += 3) DEW.push(point(s, RINGS[i]));
}

export function WebBackdrop({ activeNode }: { activeNode: string | null }) {
  const group = useRef<THREE.Group>(null);
  const lineMat = useRef<THREE.LineBasicMaterial>(null);
  const dewGroup = useRef<THREE.Group>(null);
  const geometry = useMemo(() => buildWeb(), []);
  const glow = useMemo(() => glowSprite(), []);
  const pulse = useRef(0);

  useFrame((st, dt) => {
    const t = st.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.z += dt * 0.012;
      const breathe = 1 + Math.sin(t * 0.18) * 0.012;
      group.current.scale.setScalar(breathe);
    }
    // ease a brightness pulse in/out depending on whether the agent is active
    const target = activeNode ? 1 : 0;
    pulse.current += (target - pulse.current) * Math.min(dt * 2.2, 1);
    if (lineMat.current) {
      lineMat.current.opacity = 0.62 + Math.sin(t * 0.8) * 0.05 + pulse.current * 0.14;
    }
    if (dewGroup.current) {
      dewGroup.current.children.forEach((c, i) => {
        const sprite = c as THREE.Sprite;
        const tw = 0.45 + (Math.sin(t * 1.3 + i * 1.7) + 1) * 0.18 + pulse.current * 0.2;
        sprite.material.opacity = tw;
      });
    }
  });

  return (
    <group ref={group} position={[0, 0, -5]} rotation={[0.14, 0, 0]}>
      <lineSegments geometry={geometry} raycast={() => null}>
        <lineBasicMaterial
          ref={lineMat}
          vertexColors
          transparent
          opacity={0.7}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>

      {/* faint red wash anchoring the core */}
      <sprite scale={[5, 5, 1]} position={[0, 0, zAt(0)]} raycast={() => null}>
        <spriteMaterial map={glow} color="#ff4d5e" transparent opacity={0.07} depthWrite={false} />
      </sprite>

      {/* dew-drop highlights on the strands */}
      <group ref={dewGroup}>
        {DEW.map((p, i) => (
          <sprite key={i} position={p} scale={[0.34, 0.34, 1]} raycast={() => null}>
            <spriteMaterial map={glow} color={i % 4 === 0 ? "#14151a" : "#e8323f"} transparent opacity={0.5} depthWrite={false} />
          </sprite>
        ))}
      </group>
    </group>
  );
}
