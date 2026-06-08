"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

import { NODE_POSITIONS } from "@/lib/graphTopology";

// Overview is offset to the right so the graph sits in the left ~60% of the
// screen, clear of the chat panel docked on the right.
const OVERVIEW_TARGET = new THREE.Vector3(3, 0.2, 0);
const OVERVIEW_POS = new THREE.Vector3(2, 3.5, 33);
// Radius of the idle orbit (camera distance from the overview target on xz).
const ORBIT_RADIUS = OVERVIEW_POS.clone().sub(OVERVIEW_TARGET).setY(0).length();
const ORBIT_HEIGHT = OVERVIEW_POS.y - OVERVIEW_TARGET.y;

/**
 * Cinematic camera: glides/zooms to focus the active node as the agent traverses,
 * then eases back to a slowly-orbiting overview when idle — giving the scene a
 * living, breathing parallax. Yields to the user the moment they orbit.
 */
export function CameraRig({ activeNode }: { activeNode: string | null }) {
  const camera = useThree((s) => s.camera);
  // OrbitControls registers itself as the default controls.
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
    addEventListener: (t: string, cb: () => void) => void;
    removeEventListener: (t: string, cb: () => void) => void;
  } | null;

  const interacting = useRef(false);
  const goalPos = useRef(OVERVIEW_POS.clone());
  const goalTgt = useRef(OVERVIEW_TARGET.clone());

  useEffect(() => {
    if (!controls) return;
    const onStart = () => (interacting.current = true);
    const onEnd = () => (interacting.current = false);
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);
    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
    };
  }, [controls]);

  useFrame((st) => {
    if (interacting.current) return;
    const t = st.clock.elapsedTime;

    if (activeNode && NODE_POSITIONS[activeNode]) {
      const [x, y, z] = NODE_POSITIONS[activeNode];
      goalTgt.current.set(x, y, z);
      goalPos.current.set(x + 0.5, y + 1.2, z + 7.5);
    } else {
      // Slow azimuthal sway + a faint vertical bob around the overview.
      const a = Math.sin(t * 0.05) * 0.16;
      goalTgt.current.copy(OVERVIEW_TARGET);
      goalPos.current.set(
        OVERVIEW_TARGET.x + Math.sin(a) * ORBIT_RADIUS,
        OVERVIEW_TARGET.y + ORBIT_HEIGHT + Math.sin(t * 0.07) * 0.8,
        OVERVIEW_TARGET.z + Math.cos(a) * ORBIT_RADIUS,
      );
    }

    const k = activeNode ? 0.045 : 0.02;
    camera.position.lerp(goalPos.current, k);
    if (controls) {
      controls.target.lerp(goalTgt.current, activeNode ? 0.06 : 0.03);
      controls.update();
    } else {
      camera.lookAt(goalTgt.current);
    }
  });

  return null;
}
