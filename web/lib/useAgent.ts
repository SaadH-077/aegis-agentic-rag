"use client";

import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";

import type { AgentEvent, AgentStatus, ChatMessage, TurnMetric } from "./types";

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Each conversation is a LangGraph "thread" persisted server-side (SQLite) and
// listed client-side so chats survive the browser closing. The app always opens
// on the hero with a FRESH thread; a session is only committed to the list once
// its first message is sent. Past sessions are opt-in via the sessions menu.
export interface Session {
  id: string;
  title: string;
  ts: number;
}

const SESSIONS_KEY = "aegis_sessions";
const LEGACY_KEY = "aegis_thread";
const METRICS_KEY = "aegis_metrics";
const MESSAGES_KEY = "aegis_messages";

function persist(sessions: Session[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

type MetricsStore = Record<string, TurnMetric[]>;

function persistMetrics(store: MetricsStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(METRICS_KEY, JSON.stringify(store));
}

function loadStoredMetrics(): MetricsStore {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(METRICS_KEY) || "{}") as MetricsStore;
  } catch {
    return {};
  }
}

// --- Conversation persistence (client-side source of truth) ----------------
// The full message history of each session is stored in the browser so chats
// survive everything — backend restarts/sleeps (Render free tier wipes the
// server-side SQLite), redeploys, and browser closes — until the user deletes
// the session from the UI. Keyed by thread id.
type MessageStore = Record<string, ChatMessage[]>;

function loadAllMessages(): MessageStore {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(MESSAGES_KEY) || "{}") as MessageStore;
  } catch {
    return {};
  }
}

function loadSessionMessages(id: string): ChatMessage[] {
  return loadAllMessages()[id] ?? [];
}

function persistSessionMessages(id: string, msgs: ChatMessage[]) {
  if (typeof window === "undefined") return;
  const clean = msgs.filter((m) => !m.pending && m.content);
  const all = loadAllMessages();
  if (clean.length) all[id] = clean;
  else delete all[id];
  try {
    window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(all));
  } catch {
    /* localStorage quota — drop silently rather than crash the chat */
  }
}

function deleteSessionMessages(id: string) {
  if (typeof window === "undefined") return;
  const all = loadAllMessages();
  if (!(id in all)) return;
  delete all[id];
  try {
    window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function loadStoredSessions(): Session[] {
  if (typeof window === "undefined") return [];
  let sessions: Session[] = [];
  try {
    sessions = JSON.parse(window.localStorage.getItem(SESSIONS_KEY) || "[]");
  } catch {
    sessions = [];
  }
  // migrate the old single-thread key into a session, then forget it
  const legacy = window.localStorage.getItem(LEGACY_KEY);
  if (legacy && !sessions.some((s) => s.id === legacy)) {
    sessions.unshift({ id: legacy, title: "Previous chat", ts: Date.now() });
    window.localStorage.removeItem(LEGACY_KEY);
    persist(sessions);
  }
  return sessions;
}

export interface UseAgent {
  messages: ChatMessage[];
  status: AgentStatus;
  activeNode: string | null;
  visited: string[];
  pendingApproval: { message: string } | null;
  restoring: boolean;
  sessions: Session[];
  activeId: string;
  metrics: MetricsStore;
  ask: (question: string) => Promise<void>;
  respondApproval: (approve: boolean) => Promise<void>;
  newChat: () => void;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
}

export function useAgent(): UseAgent {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [visited, setVisited] = useState<string[]>([]);
  const [pendingApproval, setPendingApproval] = useState<{ message: string } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState("");
  const [metrics, setMetrics] = useState<MetricsStore>({});
  const activeRef = useRef("");
  const askStartRef = useRef(0);
  const askQuestionRef = useRef("");

  // mount: load the saved sessions list, but open on a FRESH thread (hero).
  useEffect(() => {
    setSessions(loadStoredSessions());
    setMetrics(loadStoredMetrics());
    activeRef.current = uid();
    setActiveId(activeRef.current);
  }, []);

  // Persist the active conversation to the browser on every change (so it
  // survives backend restarts/sleeps and page reloads). Skipped while restoring
  // and while nothing real has been said yet.
  useEffect(() => {
    if (restoring) return;
    const id = activeRef.current;
    if (!id) return;
    if (!messages.some((m) => !m.pending && m.content)) return;
    persistSessionMessages(id, messages);
  }, [messages, restoring]);

  const loadHistory = useCallback(async (id: string) => {
    setRestoring(true);
    setMessages([]);
    // 1) The browser store is the source of truth — it survives backend
    //    restarts (Render free tier wipes the server-side SQLite checkpoints).
    const local = loadSessionMessages(id);
    if (local.length) {
      if (activeRef.current === id) {
        setMessages(local);
        setRestoring(false);
      }
      return;
    }
    // 2) Fallback for older sessions: the backend thread history (best-effort).
    try {
      const resp = await fetch(`/api/history?thread_id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = (await resp.json()) as { messages?: { role: string; content: string }[] };
      if (activeRef.current === id && Array.isArray(data.messages) && data.messages.length) {
        const restored: ChatMessage[] = data.messages
          .filter((m) => m.content?.trim())
          .map((m) => ({ id: uid(), role: m.role === "user" ? "user" : "assistant", content: m.content }));
        setMessages(restored);
        persistSessionMessages(id, restored); // cache so it's instant next time
      }
    } catch {
      /* fresh thread */
    } finally {
      if (activeRef.current === id) setRestoring(false);
    }
  }, []);

  const consume = useCallback(async (url: string, body: unknown) => {
    setStatus("thinking");
    let resp: Response;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      failPending(setMessages, `Could not reach the backend (${String(err)}).`);
      setStatus("error");
      setActiveNode(null);
      return;
    }
    if (!resp.ok || !resp.body) {
      failPending(setMessages, `Backend returned HTTP ${resp.status}.`);
      setStatus("error");
      setActiveNode(null);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        const json = dataLine.slice(5).trim();
        if (!json) continue;
        let evt: AgentEvent;
        try {
          evt = JSON.parse(json) as AgentEvent;
        } catch {
          continue;
        }
        handleEvent(evt);
      }
    }
  }, []);

  function handleEvent(evt: AgentEvent) {
    switch (evt.type) {
      case "start":
        break;
      case "node":
        setActiveNode(evt.node);
        if (Array.isArray(evt.steps) && evt.steps.length) setVisited(evt.steps);
        else setVisited((prev) => (prev.includes(evt.node) ? prev : [...prev, evt.node]));
        break;
      case "interrupt":
        setActiveNode("web_gate");
        setVisited((prev) => (prev.includes("web_gate") ? prev : [...prev, "web_gate"]));
        setPendingApproval({ message: evt.interrupt?.message ?? "Approve a web search?" });
        setStatus("awaiting_approval");
        break;
      case "complete": {
        const latencyMs = askStartRef.current ? Date.now() - askStartRef.current : undefined;
        // Record this turn's metrics for the per-session metrics viewer.
        const turn: TurnMetric = {
          id: uid(),
          question: askQuestionRef.current,
          ts: Date.now(),
          latencyMs,
          timings: evt.timings ?? [],
          retries: evt.retries ?? 0,
          steps: evt.steps ?? [],
          route: evt.route,
          webSearchUsed: evt.web_search_used,
        };
        const sessionId = activeRef.current;
        if (turn.timings.length || turn.steps.length) {
          setMetrics((prev) => {
            const next = { ...prev, [sessionId]: [...(prev[sessionId] ?? []), turn] };
            persistMetrics(next);
            return next;
          });
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.pending
              ? {
                  ...m,
                  pending: false,
                  content: evt.answer || "_(no answer returned)_",
                  route: evt.route,
                  webSearchUsed: evt.web_search_used,
                  citations: evt.citations ?? [],
                  steps: evt.steps ?? [],
                  timings: evt.timings ?? [],
                  retries: evt.retries ?? 0,
                  latencyMs,
                }
              : m,
          ),
        );
        setStatus("idle");
        setActiveNode(null);
        break;
      }
      case "error":
        failPending(setMessages, evt.detail);
        setStatus("error");
        setActiveNode(null);
        break;
    }
  }

  const ask = useCallback(
    async (question: string) => {
      const id = activeRef.current || uid();
      activeRef.current = id;
      askStartRef.current = Date.now();
      askQuestionRef.current = question;
      const title = question.length > 42 ? `${question.slice(0, 42)}…` : question;
      // commit this thread to the sessions list on its first message
      setSessions((prev) => {
        const exists = prev.some((s) => s.id === id);
        const next = exists
          ? prev.map((s) => (s.id === id ? { ...s, ts: Date.now() } : s))
          : [{ id, title, ts: Date.now() }, ...prev];
        persist(next);
        return next;
      });
      setActiveId(id);
      const userMsg: ChatMessage = { id: uid(), role: "user", content: question };
      const pendingMsg: ChatMessage = { id: uid(), role: "assistant", content: "", pending: true };
      setMessages((prev) => [...prev, userMsg, pendingMsg]);
      setVisited([]);
      setActiveNode(null);
      setPendingApproval(null);
      await consume("/api/stream", { question, thread_id: id });
    },
    [consume],
  );

  const respondApproval = useCallback(
    async (approve: boolean) => {
      setPendingApproval(null);
      await consume("/api/resume", { thread_id: activeRef.current, approve });
    },
    [consume],
  );

  const resetView = useCallback(() => {
    setMessages([]);
    setVisited([]);
    setActiveNode(null);
    setPendingApproval(null);
    setStatus("idle");
    setRestoring(false);
  }, []);

  // New chat → a fresh thread (committed only once you send a message).
  const newChat = useCallback(() => {
    activeRef.current = uid();
    setActiveId(activeRef.current);
    resetView();
  }, [resetView]);

  const selectSession = useCallback(
    (id: string) => {
      if (id === activeRef.current && messages.length) return;
      activeRef.current = id;
      setActiveId(id);
      setVisited([]);
      setActiveNode(null);
      setPendingApproval(null);
      setStatus("idle");
      void loadHistory(id);
    },
    [loadHistory, messages.length],
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        persist(next);
        return next;
      });
      setMetrics((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        persistMetrics(next);
        return next;
      });
      deleteSessionMessages(id);
      if (id === activeRef.current) {
        activeRef.current = uid();
        setActiveId(activeRef.current);
        resetView();
      }
    },
    [resetView],
  );

  return {
    messages,
    status,
    activeNode,
    visited,
    pendingApproval,
    restoring,
    sessions,
    activeId,
    metrics,
    ask,
    respondApproval,
    newChat,
    selectSession,
    deleteSession,
  };
}

function failPending(setMessages: Dispatch<SetStateAction<ChatMessage[]>>, detail: string) {
  setMessages((prev) => prev.map((m) => (m.pending ? { ...m, pending: false, content: `⚠️ ${detail}` } : m)));
}
