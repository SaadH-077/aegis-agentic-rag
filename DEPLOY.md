# Deploying AEGIS (100% free tier)

AEGIS deploys as **two services**, both on free plans:

| Service | What runs | Host | Cost |
| --- | --- | --- | --- |
| **Backend** | FastAPI + LangGraph agent + FAISS | **Render** (free web service) | $0 |
| **Frontend** | Next.js + Node BFF + 3D UI | **Vercel** (Hobby) | $0 |

The browser only ever talks to the Vercel app; the Vercel BFF proxies to Render
**server-side**, so your API keys never touch the client and there are no CORS
issues.

```
Browser ──HTTPS──> Vercel (Next.js + BFF) ──server-to-server──> Render (FastAPI)
                                                                   ├─> Groq (LLM)
                                                                   ├─> Hugging Face (embeddings)
                                                                   └─> DuckDuckGo (web search)
```

> **Why this fits free tiers:** no `torch` (embeddings run over the HF API), the
> LLM is a hosted API (Groq), and the FAISS index is committed to the repo
> (~164 KB) — so there's no heavy model download and no build-time embedding step.

---

## 0. Get the two free keys (5 min)

1. **Groq** — sign in at <https://console.groq.com/keys> → *Create API Key* → copy it (`gsk_…`).
2. **Hugging Face** — <https://huggingface.co/settings/tokens> → *New token*, role **read** → copy it (`hf_…`). Used for embeddings only.

(LangSmith tracing is optional — skip unless you want request traces.)

---

## 1. Backend → Render

Render reads the included [`render.yaml`](render.yaml) **Blueprint**, so this is mostly clicks.

1. Go to <https://dashboard.render.com> → **New +** → **Blueprint**.
2. Connect your GitHub and pick the **`aegis-agentic-rag`** repo.
3. Render detects `render.yaml` and shows the **`aegis-backend`** service. Click **Apply**.
4. When prompted for the two secret env vars (`sync: false`), paste:
   - `GROQ_API_KEY` = your `gsk_…`
   - `HF_TOKEN` = your `hf_…`
5. Click **Create / Deploy**. First build takes ~3–5 min.
6. When it's live, note the URL, e.g. `https://aegis-backend.onrender.com`.
   Verify: open `https://aegis-backend.onrender.com/health` → you should see `{"status":"ok",…}`.

> **Free-tier behaviour:** the service **sleeps after ~15 min idle**; the next
> request wakes it (~50 s cold start), then it's fast again. The frontend pings
> `/stats` on load, which helps warm it before you ask anything. Conversation
> memory (SQLite) is per-process and resets on sleep — fine for a demo; chat
> history + metrics also persist client-side in the browser.

---

## 2. Frontend → Vercel

1. Go to <https://vercel.com/new> → **Import** the same `aegis-agentic-rag` repo.
2. **Important — set the Root Directory to `web`** (click *Edit* next to Root Directory and choose `web`). Vercel auto-detects Next.js.
3. Add one **Environment Variable**:
   - `BACKEND_URL` = `https://aegis-backend.onrender.com`  *(your Render URL from step 1.6, no trailing slash)*
4. Click **Deploy**. ~2 min later you get a URL like `https://aegis-agentic-rag.vercel.app`.

That's it — open the Vercel URL and ask AEGIS a question.

---

## 3. Verify end-to-end

- **KB question** (uses the vector store): *"What is corrective RAG?"* — watch the graph traverse `retrieve → grade_documents → generate → grade_generation`.
- **Web question** (HITL gate): *"Who is the current CEO of OpenAI?"* — it should route to web and ask you to approve a search.
- Open **System Prompts** (top bar / ⌘) to confirm the backend is reachable.
- Open a session's **metrics** to see real per-node latency.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| "Could not reach the backend" | `BACKEND_URL` on Vercel is wrong or has a trailing slash. Fix and redeploy. |
| First request hangs ~50 s | Render free cold start — expected after idle. Reload once it wakes. |
| "Cannot connect to load system prompts" | Backend not finished deploying, or an old deploy. Check Render logs / `/health`. |
| 401 from Hugging Face | `HF_TOKEN` missing/invalid on Render (embeddings need it even with Groq). |
| Groq 401 / rate limit | `GROQ_API_KEY` missing, or you hit the free rate limit — wait a moment. |
| Want it always-on (no cold start) | Render free sleeps; upgrade the service, or ping `/health` every ~10 min with a free uptime monitor. |

## Updating the deployment

Both services have **auto-deploy on push** to `main`. Just:

```bash
git add -A && git commit -m "…" && git push
```

Render rebuilds the backend and Vercel rebuilds the frontend automatically.

## Rebuilding the FAISS index

The index is committed, so you normally don't touch it. To regenerate it (e.g.
after changing the corpus in `data/corpus/`):

```bash
python -m agentic_rag.ingest    # writes storage/faiss_index/
git add storage/faiss_index && git commit -m "rebuild index" && git push
```
