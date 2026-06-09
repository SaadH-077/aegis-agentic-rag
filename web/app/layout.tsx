import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "AEGIS · Agentic RAG",
  description:
    "AEGIS — Agentic Execution & Graph-based Intelligence System: an agentic RAG assistant that assembles grounded answers from a curated knowledge base and the live web. Built with LangChain, LangGraph and LangSmith.",
};

// Without this, mobile browsers render the page at ~980px and zoom out, so the
// responsive (max-width: 820px) styles never activate. device-width fixes that;
// viewportFit:"cover" lets us pad around notches/rounded corners via safe-area.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#eef1f6",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
