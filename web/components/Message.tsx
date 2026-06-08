"use client";

import { type ReactNode, useState } from "react";

import type { ChatMessage } from "@/lib/types";
import { Logo } from "./Logo";

const NODE_LABELS: Record<string, string> = {
  contextualize: "Contextualize",
  route_question: "Route",
  direct_answer: "Direct Answer",
  retrieve: "Retrieve",
  grade_documents: "Grade Docs",
  transform_query: "Rewrite",
  web_gate: "Human Gate",
  web_search: "Web Search",
  answer_from_knowledge: "Model Answer",
  generate: "Generate",
  grade_generation: "Self-Check",
  finalize: "Finalize",
};

export function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className={`msg ${isUser ? "msg--user" : "msg--assistant"} animate-fade-in`}>
      {!isUser && (
        <div className="msg__avatar">
          <Logo size={22} />
        </div>
      )}
      <div className="msg__col">
        {!isUser && <div className="msg__sender">AEGIS</div>}
        <div className="msg__bubble">
        {message.pending ? (
          <ThinkingDots />
        ) : isUser ? (
          <div className="msg__content">{message.content}</div>
        ) : (
          <div className="msg__content">
            <MarkdownLite text={message.content} />
          </div>
        )}

        {!isUser && !message.pending && (
          <div className="msg__metrics">
            {message.route && (
              <span className="metric">
                route <b>{message.route}</b>
              </span>
            )}
            {message.webSearchUsed && <span className="metric metric--web">web</span>}
            {typeof message.latencyMs === "number" && (
              <span className="metric">{(message.latencyMs / 1000).toFixed(1)}s</span>
            )}
            {message.steps && message.steps.length > 0 && (
              <span className="metric">{message.steps.length} steps</span>
            )}
            {typeof message.retries === "number" && message.retries > 0 && (
              <span className="metric metric--retry">
                {message.retries} {message.retries === 1 ? "retry" : "retries"}
              </span>
            )}
            {message.citations && message.citations.length > 0 && (
              <span className="metric">{message.citations.length} sources</span>
            )}
            <button className="msg__copy" onClick={copy} aria-label="Copy answer">
              {copied ? "✓ copied" : "copy"}
            </button>
          </div>
        )}

        {!isUser && !message.pending && message.steps && message.steps.length > 0 && (
          <details className="msg__details">
            <summary>graph path · {message.steps.length} steps</summary>
            <div className="trace">
              {message.steps.map((s, i) => (
                <span key={`${s}-${i}`} className="trace__step">
                  {NODE_LABELS[s] ?? s}
                </span>
              ))}
            </div>
          </details>
        )}

        {!isUser && message.citations && message.citations.length > 0 && (
          <details className="msg__details">
            <summary>sources · {message.citations.length}</summary>
            <div className="cites">
              {message.citations.map((c, i) => (
                <div key={`${c.source}-${i}`} className="cite">
                  <span className="cite__src">
                    <span className={`cite__tag cite__tag--${c.origin === "web_search" ? "web" : "doc"}`}>
                      {c.origin === "web_search" ? "web" : "doc"}
                    </span>
                    {isHttp(c.source) ? (
                      <a href={c.source} target="_blank" rel="noopener noreferrer" className="cite__link">
                        {c.source}
                      </a>
                    ) : (
                      c.source
                    )}
                  </span>
                  <span className="cite__snip">{c.snippet}</span>
                </div>
              ))}
            </div>
          </details>
        )}
        </div>
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="dots" aria-label="thinking">
      <span />
      <span />
      <span />
    </div>
  );
}

function isHttp(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

/**
 * Dependency-free GitHub-flavored-Markdown renderer.
 * Blocks: # / ## / ### headings, --- rules, > blockquotes, fenced ``` code,
 * `-`/`*` bullet lists, `1.` ordered lists, paragraphs.
 * Inline: **bold**, *italic* / _italic_, `code`, and clickable [links](url).
 */
function MarkdownLite({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const parts = text.split("```");
  parts.forEach((part, pi) => {
    if (pi % 2 === 1) {
      const body = part.replace(/^[a-zA-Z0-9+#-]*\n/, "");
      out.push(
        <pre key={`pre-${pi}`} className="md-pre">
          <code>{body.replace(/\n$/, "")}</code>
        </pre>,
      );
      return;
    }
    renderBlocks(part, pi, out);
  });
  return <>{out}</>;
}

function renderBlocks(part: string, pi: number, out: ReactNode[]) {
  const lines = part.split("\n");
  let para: string[] = [];
  let ul: string[] = [];
  let ol: string[] = [];
  let quote: string[] = [];

  const flushPara = (k: string) => {
    if (para.length) {
      out.push(
        <p key={k} className="md-p">
          {inline(para.join(" "), k)}
        </p>,
      );
      para = [];
    }
  };
  const flushUl = (k: string) => {
    if (ul.length) {
      out.push(
        <ul key={k} className="md-ul">
          {ul.map((li, idx) => (
            <li key={idx}>{inline(li, `${k}-${idx}`)}</li>
          ))}
        </ul>,
      );
      ul = [];
    }
  };
  const flushOl = (k: string) => {
    if (ol.length) {
      out.push(
        <ol key={k} className="md-ol">
          {ol.map((li, idx) => (
            <li key={idx}>{inline(li, `${k}-${idx}`)}</li>
          ))}
        </ol>,
      );
      ol = [];
    }
  };
  const flushQuote = (k: string) => {
    if (quote.length) {
      out.push(
        <blockquote key={k} className="md-quote">
          {inline(quote.join(" "), k)}
        </blockquote>,
      );
      quote = [];
    }
  };
  const flushAll = (k: string) => {
    flushPara(`${k}-p`);
    flushUl(`${k}-u`);
    flushOl(`${k}-o`);
    flushQuote(`${k}-q`);
  };

  lines.forEach((line, li) => {
    const t = line.trim();
    const key = `${pi}-${li}`;
    const heading = /^(#{1,4})\s+(.*)$/.exec(t);
    if (heading) {
      flushAll(key);
      const level = Math.min(heading[1].length, 4);
      const Tag = `h${level + 1}` as "h2" | "h3" | "h4" | "h5";
      out.push(
        <Tag key={`h-${key}`} className={`md-h md-h${level}`}>
          {inline(heading[2], `h-${key}`)}
        </Tag>,
      );
    } else if (/^(---|\*\*\*|___)$/.test(t)) {
      flushAll(key);
      out.push(<hr key={`hr-${key}`} className="md-hr" />);
    } else if (/^>\s?/.test(t)) {
      flushPara(`${key}-p`);
      flushUl(`${key}-u`);
      flushOl(`${key}-o`);
      quote.push(t.replace(/^>\s?/, ""));
    } else if (/^[-*]\s+/.test(t)) {
      flushPara(`${key}-p`);
      flushOl(`${key}-o`);
      flushQuote(`${key}-q`);
      ul.push(t.replace(/^[-*]\s+/, ""));
    } else if (/^\d+[.)]\s+/.test(t)) {
      flushPara(`${key}-p`);
      flushUl(`${key}-u`);
      flushQuote(`${key}-q`);
      ol.push(t.replace(/^\d+[.)]\s+/, ""));
    } else if (t === "") {
      flushAll(key);
    } else {
      flushUl(`${key}-u`);
      flushOl(`${key}-o`);
      flushQuote(`${key}-q`);
      para.push(t);
    }
  });
  flushAll(`${pi}-end`);
}

/** A clickable link that shows a clean, readable label instead of a raw URL. */
function linkNode(href: string, label: string, key: string): ReactNode {
  return (
    <a key={key} className="md-link" href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

/** Turn a raw URL into a short, readable label: "en.wikipedia.org › Kehlsteinhaus". */
function prettyUrl(u: string): string {
  try {
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./, "");
    const seg = url.pathname.split("/").filter(Boolean).pop();
    if (!seg) return host;
    const title = decodeURIComponent(seg).replace(/[-_]+/g, " ").replace(/\.\w+$/, "");
    return `${host} › ${title}`;
  } catch {
    return u;
  }
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Order matters: inline code, then Markdown links [t](u), then bracketed bare
  // URLs [http…], then bare URLs http…, then bold, then italic.
  const regex =
    /(`[^`]+`)|(\[[^\]]+\]\([^)\s]+\))|(\[\s*https?:\/\/[^\]\s]+\s*\])|(https?:\/\/[^\s<)\]]+)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(_[^_\s][^_]*_)/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      nodes.push(
        <code key={`${keyPrefix}-c${i}`} className="md-code">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("[") && /\]\(/.test(tok)) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok);
      if (link) nodes.push(linkNode(link[2], link[1], `${keyPrefix}-l${i}`));
      else nodes.push(tok);
    } else if (tok.startsWith("[")) {
      // Bracketed bare URL like [https://en.wikipedia.org/wiki/Kehlsteinhaus]
      const url = tok.slice(1, -1).trim();
      nodes.push(linkNode(url, prettyUrl(url), `${keyPrefix}-u${i}`));
    } else if (tok.startsWith("http")) {
      // Bare URL — strip trailing sentence punctuation back into the text flow.
      const trimmed = tok.replace(/[.,;:!?]+$/, "");
      nodes.push(linkNode(trimmed, prettyUrl(trimmed), `${keyPrefix}-h${i}`));
      const tail = tok.slice(trimmed.length);
      if (tail) nodes.push(tail);
    } else if (tok.startsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{tok.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={`${keyPrefix}-i${i}`}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
