"use client";

import { useId } from "react";

// AEGIS mark: a radial graph/web spun from a glowing core, set inside a
// hexagonal shield frame (aegis = shield). Generated geometrically so it stays
// crisp at any size. No emoji, fully vector.
const ANGLES = [0, 60, 120, 180, 240, 300].map((d) => (d * Math.PI) / 180);
const C = 24;

function ring(r: number): string {
  // start at -90° so the hexagon sits point-up like a shield
  return ANGLES.map((a) => {
    const ang = a - Math.PI / 2;
    return `${(C + r * Math.cos(ang)).toFixed(1)},${(C + r * Math.sin(ang)).toFixed(1)}`;
  }).join(" ");
}

export function Logo({ size = 34 }: { size?: number }) {
  // Unique gradient ids per instance — multiple inline SVGs sharing one id is
  // invalid and renders blank in some browsers (notably mobile Safari/Chrome).
  const uid = useId().replace(/[:]/g, "");
  const g = `aegis-g-${uid}`;
  const core = `aegis-core-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="AEGIS"
    >
      <defs>
        <linearGradient id={g} x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e8323f" />
          <stop offset="1" stopColor="#14151a" />
        </linearGradient>
        <radialGradient id={core} cx="24" cy="24" r="5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff6b76" />
          <stop offset="1" stopColor="#e8323f" />
        </radialGradient>
      </defs>

      {/* shield plate */}
      <polygon points={ring(21)} fill={`url(#${g})`} opacity="0.08" />

      {/* radial spokes */}
      <g stroke={`url(#${g})`} strokeWidth="1.1" strokeLinecap="round" opacity="0.8">
        {ANGLES.map((a, i) => {
          const ang = a - Math.PI / 2;
          return (
            <line
              key={`s-${i}`}
              x1="24"
              y1="24"
              x2={(C + 17 * Math.cos(ang)).toFixed(1)}
              y2={(C + 17 * Math.sin(ang)).toFixed(1)}
            />
          );
        })}
      </g>

      {/* inner web rings */}
      <g stroke={`url(#${g})`} strokeWidth="1" fill="none">
        <polygon points={ring(12)} opacity="0.7" />
        <polygon points={ring(6.5)} opacity="0.9" />
      </g>

      {/* shield frame (bold outer hexagon) */}
      <polygon points={ring(21)} fill="none" stroke={`url(#${g})`} strokeWidth="2" strokeLinejoin="round" />

      {/* node dots at the web intersections */}
      <g fill={`url(#${g})`}>
        {[17, 12].flatMap((r) =>
          ANGLES.map((a, i) => {
            const ang = a - Math.PI / 2;
            return (
              <circle
                key={`n-${r}-${i}`}
                cx={(C + r * Math.cos(ang)).toFixed(1)}
                cy={(C + r * Math.sin(ang)).toFixed(1)}
                r={r === 17 ? 1.6 : 1.2}
              />
            );
          }),
        )}
      </g>

      <circle cx="24" cy="24" r="3.2" fill={`url(#${core})`} />
    </svg>
  );
}
