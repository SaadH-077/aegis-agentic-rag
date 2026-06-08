// Procedural soft-radial glow texture — the additive halo behind nodes and the
// dew drops / core of the web. Generated once on a 2D canvas and cached, so
// there are no image assets to ship.

import * as THREE from "three";

let glowTexture: THREE.Texture | null = null;
let ringTexture: THREE.Texture | null = null;

/** Tight, bright-cored radial falloff — the halo that makes a node read as luminous. */
export function glowSprite(): THREE.Texture {
  if (glowTexture) return glowTexture;
  glowTexture = radial(128, [
    [0.0, "rgba(255,255,255,1)"],
    [0.18, "rgba(255,255,255,0.85)"],
    [0.42, "rgba(255,255,255,0.28)"],
    [1.0, "rgba(255,255,255,0)"],
  ]);
  return glowTexture;
}

/** A thin HUD reticle — ring + inner ring + corner ticks — the futuristic node frame. */
export function ringSprite(): THREE.Texture {
  if (ringTexture) return ringTexture;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;

  ctx.lineCap = "round";
  // main ring
  ctx.strokeStyle = "rgba(255,255,255,1)";
  ctx.lineWidth = size * 0.018;
  ctx.beginPath();
  ctx.arc(c, c, size * 0.4, 0, Math.PI * 2);
  ctx.stroke();
  // faint inner ring
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = size * 0.009;
  ctx.beginPath();
  ctx.arc(c, c, size * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  // four corner ticks
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = size * 0.022;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * size * 0.43, c + Math.sin(a) * size * 0.43);
    ctx.lineTo(c + Math.cos(a) * size * 0.49, c + Math.sin(a) * size * 0.49);
    ctx.stroke();
  }

  ringTexture = new THREE.CanvasTexture(canvas);
  ringTexture.colorSpace = THREE.SRGBColorSpace;
  ringTexture.needsUpdate = true;
  return ringTexture;
}

function radial(size: number, stops: [number, string][]): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const r = size / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  for (const [offset, color] of stops) grad.addColorStop(offset, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
