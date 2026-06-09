"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

import { NODE_POSITIONS } from "@/lib/graphTopology";

// Desktop: the 3D canvas is clipped to the area left of the (resizable) chat
// panel, so the graph is centered within its own region.
const OVERVIEW_TARGET = new THREE.Vector3(0, 0.2, 0);
const OVERVIEW_POS = new THREE.Vector3(0, 3.5, 33);
// Mobile: centered (chat is a separate full-screen surface) and pulled back so
// the whole web fits a narrow portrait viewport.
const OVERVIEW_TARGET_M = new THREE.Vector3(0, 0.2, 0);
const OVERVIEW_POS_M = new THREE.Vector3(0, 3, 46);

/**
 * Cinematic camera: glides/zooms to focus the active node as the agent traverses,
 * then eases back to a slowly-orbiting overview when idle — giving the scene a
 * living, breathing parallax. Yields to the user the moment they orbit.
 */
export function CameraRig({ activeNode, isMobile = false }: { activeNode: string | null; isMobile?: boolean }) {
  const overviewPos = isMobile ? OVERVIEW_POS_M : OVERVIEW_POS;
  const overviewTgt = isMobile ? OVERVIEW_TARGET_M : OVERVIEW_TARGET;
  const orbitRadius = overviewPos.clone().sub(overviewTgt).setY(0).length();
  const orbitHeight = overviewPos.y - overviewTgt.y;
  const camera = useThree((s) => s.camera);
  // OrbitControls registers itself as the default controls.
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
    addEventListener: (t: string, cb: () => void) => void;
    removeEventListener: (t: string, cb: () => void) => void;
  } | null;

  const interacting = useRef(false);
  const goalPos = useRef(overviewPos.clone());
  const goalTgt = useRef(overviewTgt.clone());

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
      // Pull back further on mobile so the focused node isn't overwhelmingly large.
      goalTgt.current.set(x, y, z);
      goalPos.current.set(x + 0.5, y + 1.2, z + (isMobile ? 12 : 7.5));
    } else {
      // Slow azimuthal sway + a faint vertical bob around the overview.
      const a = Math.sin(t * 0.05) * 0.16;
      goalTgt.current.copy(overviewTgt);
      goalPos.current.set(
        overviewTgt.x + Math.sin(a) * orbitRadius,
        overviewTgt.y + orbitHeight + Math.sin(t * 0.07) * 0.8,
        overviewTgt.z + Math.cos(a) * orbitRadius,
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
