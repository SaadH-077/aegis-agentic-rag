"use client";

import { useEffect, useState } from "react";

/**
 * Tracks whether the viewport is in the mobile breakpoint (< 820px), kept in
 * sync via `matchMedia`. Drives the chat-first mobile layout and the
 * auto-revealing graph overlay.
 */
export function useIsMobile(breakpoint = 820): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}
