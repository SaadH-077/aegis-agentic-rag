import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "AEGIS · Agentic RAG",
  description:
    "AEGIS — Agentic Execution & Graph-based Intelligence System: an agentic RAG assistant that assembles grounded answers from a curated knowledge base and the live web. Built with LangChain, LangGraph and LangSmith.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
