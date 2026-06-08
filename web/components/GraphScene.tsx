"use client";

import { Html, QuadraticBezierLine } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { EDGES, NODES, NODE_POSITIONS, edgeKey } from "@/lib/graphTopology";
import { glowSprite, ringSprite } from "@/lib/sprites";
import type { GraphEdge, GraphNode } from "@/lib/types";

type NodeState = "idle" | "visited" | "active";

// Miles Morales: black web + red nodes on a white "game screen".
const INK = "#14151a"; // black — web, outlines, reticles
const RED = "#e8323f"; // node red
const RED_HOT = "#ff2e45"; // active red

function vec(id: string): THREE.Vector3 {
  const p = NODE_POSITIONS[id];
  return new THREE.Vector3(p[0], p[1], p[2]);
}

function controlPoint(a: THREE.Vector3, b: THREE.Vector3, edge?: GraphEdge): THREE.Vector3 {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  if (edge?.bow) {
    mid.y += edge.bow[0];
    mid.z += edge.bow[1];
  } else if (edge?.loop) {
    mid.z += 3.0;
    mid.y -= 3.0;
  } else {
    mid.z += 0.7;
  }
  return mid;
}

function bezierAt(a: THREE.Vector3, m: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  const omt = 1 - t;
  return new THREE.Vector3(
    omt * omt * a.x + 2 * omt * t * m.x + t * t * b.x,
    omt * omt * a.y + 2 * omt * t * m.y + t * t * b.y,
    omt * omt * a.z + 2 * omt * t * m.z + t * t * b.z,
  );
}

export function GraphScene({
  visited,
  activeNode,
  onSelect,
}: {
  visited: string[];
  activeNode: string | null;
  onSelect: (id: string) => void;
}) {
  const visitedSet = useMemo(() => new Set(visited), [visited]);

  const activeEdges = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < visited.length - 1; i++) s.add(edgeKey(visited[i], visited[i + 1]));
    return s;
  }, [visited]);

  const currentEdge = useMemo(() => {
    if (!activeNode || visited.length < 2) return null;
    const prev = visited[visited.length - 2];
    return EDGES.find((e) => e.from === prev && e.to === activeNode) ?? null;
  }, [visited, activeNode]);

  return (
    <group>
      {EDGES.map((e) => (
        <EdgeCurve key={edgeKey(e.from, e.to)} edge={e} active={activeEdges.has(edgeKey(e.from, e.to))} />
      ))}

      {currentEdge && <EdgePulse edge={currentEdge} />}

      {NODES.map((n) => (
        <NodeMesh
          key={n.id}
          node={n}
          state={n.id === activeNode ? "active" : visitedSet.has(n.id) ? "visited" : "idle"}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function EdgeCurve({ edge, active }: { edge: GraphEdge; active: boolean }) {
  const a = useMemo(() => vec(edge.from), [edge.from]);
  const b = useMemo(() => vec(edge.to), [edge.to]);
  const mid = useMemo(() => controlPoint(a, b, edge), [a, b, edge]);
  const labelPos = useMemo(() => bezierAt(a, mid, b, 0.5), [a, mid, b]);

  const arrow = useMemo(() => {
    const tip = bezierAt(a, mid, b, 0.83);
    const back = bezierAt(a, mid, b, 0.74);
    const dir = tip.clone().sub(back).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return { pos: tip, quat };
  }, [a, mid, b]);

  const color = active ? RED_HOT : INK;

  return (
    <>
      <QuadraticBezierLine
        start={a.toArray()}
        end={b.toArray()}
        mid={mid.toArray()}
        color={color}
        lineWidth={active ? 3.6 : 1.7}
        transparent
        opacity={active ? 1 : edge.loop ? 0.42 : 0.58}
        dashed={!!edge.conditional && !active}
        dashScale={2.5}
        dashSize={0.5}
        gapSize={0.3}
      />
      <mesh position={arrow.pos} quaternion={arrow.quat} raycast={() => null}>
        <coneGeometry args={[0.12, 0.3, 10]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 1 : 0.6} />
      </mesh>
      {edge.label && (
        <Html position={labelPos.toArray()} center className="pointer-events-none" zIndexRange={[6, 0]}>
          <div className={`edge-label${active ? " edge-label--active" : ""}`}>{edge.label}</div>
        </Html>
      )}
    </>
  );
}

function EdgePulse({ edge }: { edge: GraphEdge }) {
  const ref = useRef<THREE.Mesh>(null);
  const a = useMemo(() => vec(edge.from), [edge.from]);
  const b = useMemo(() => vec(edge.to), [edge.to]);
  const mid = useMemo(() => controlPoint(a, b, edge), [a, b, edge]);

  useFrame((st) => {
    const t = (Math.sin(st.clock.elapsedTime * 2.0 - Math.PI / 2) + 1) / 2;
    const p = bezierAt(a, mid, b, t);
    ref.current?.position.set(p.x, p.y, p.z);
  });

  return (
    <mesh ref={ref} raycast={() => null}>
      <sphereGeometry args={[0.13, 16, 16]} />
      <meshBasicMaterial color={RED_HOT} />
    </mesh>
  );
}

function NodeMesh({
  node,
  state,
  onSelect,
}: {
  node: GraphNode;
  state: NodeState;
  onSelect: (id: string) => void;
}) {
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Sprite>(null);
  const pingRef = useRef<THREE.Sprite>(null);
  const isAnchor = node.kind === "anchor";
  const coreR = isAnchor ? 0.22 : 0.32;
  const ringScale = isAnchor ? 1.45 : 1.95;
  const ringTex = useMemo(() => ringSprite(), []);
  const glowTex = useMemo(() => glowSprite(), []);

  const ringOpacity = state === "active" ? 1 : state === "visited" ? 0.9 : 0.5;
  const haloOpacity = state === "active" ? 0.4 : state === "visited" ? 0.22 : 0;
  const coreColor = state === "active" ? RED_HOT : RED;

  useFrame((st, dt) => {
    const t = st.clock.elapsedTime;
    if (ringRef.current && state === "active") ringRef.current.material.rotation += dt * 0.8;
    if (coreRef.current) coreRef.current.scale.setScalar(state === "active" ? 1 + Math.sin(t * 4) * 0.12 : 1);
    if (pingRef.current) {
      if (state === "active") {
        const p = (t % 1.6) / 1.6;
        const sc = ringScale * (1 + p * 1.5);
        pingRef.current.scale.set(sc, sc, 1);
        pingRef.current.material.opacity = 0.55 * (1 - p);
        pingRef.current.visible = true;
      } else {
        pingRef.current.visible = false;
      }
    }
  });

  const select = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(node.id);
  };
  const hover = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = "pointer";
  };
  const unhover = () => {
    document.body.style.cursor = "default";
  };

  return (
    <group position={node.position}>
      {/* soft red aura (subtle, only when in play) */}
      {haloOpacity > 0 && (
        <sprite scale={[ringScale * 1.7, ringScale * 1.7, 1]} raycast={() => null}>
          <spriteMaterial map={glowTex} color={RED} transparent opacity={haloOpacity} depthWrite={false} />
        </sprite>
      )}

      {/* black comic outline */}
      <mesh raycast={() => null} scale={1.16}>
        <sphereGeometry args={[coreR, 28, 28]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>

      {/* red core */}
      <mesh ref={coreRef} raycast={() => null}>
        <sphereGeometry args={[coreR, 28, 28]} />
        <meshBasicMaterial color={coreColor} />
      </mesh>

      {/* black HUD reticle ring */}
      <sprite ref={ringRef} scale={[ringScale, ringScale, 1]} raycast={() => null}>
        <spriteMaterial map={ringTex} color={INK} transparent opacity={ringOpacity} depthWrite={false} />
      </sprite>

      {/* red radar ping while active */}
      <sprite ref={pingRef} scale={[ringScale, ringScale, 1]} visible={false} raycast={() => null}>
        <spriteMaterial map={ringTex} color={RED_HOT} transparent opacity={0.5} depthWrite={false} />
      </sprite>

      {/* invisible, generous hit target */}
      <mesh onClick={select} onPointerOver={hover} onPointerOut={unhover}>
        <sphereGeometry args={[ringScale * 0.5, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Html center position={[0, -(ringScale * 0.5 + 0.34), 0]} className="pointer-events-none" zIndexRange={[8, 0]}>
        <div className={`gnode gnode--${state}`}>
          <span className="gnode__dot" />
          <span className="gnode__label">{node.label}</span>
        </div>
      </Html>
    </group>
  );
}
