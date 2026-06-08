# Memory in LLM Agents

LLMs are **stateless** between calls — each request only knows what is in its
context window. **Memory** is the machinery that carries information across turns
and sessions so an agent can hold a coherent conversation and remember a user.

## Short-term (working) memory

The running conversation, kept inside the context window. As a chat grows it can
exceed the window, so applications manage it by:

- **Windowing** — keep only the last N messages.
- **Summarisation** — periodically compress older turns into a running summary,
  preserving key facts while freeing tokens.
- **Token budgeting** — trim or summarise to fit a target token count.

## Long-term memory

Information persisted beyond a single session, typically in a store the agent can
retrieve from:

- **Episodic** — past conversations or events (often embedded and retrieved with
  the same vector-search machinery as RAG).
- **Semantic** — durable facts about the user or domain ("prefers metric units").
- **Procedural** — learned skills or instructions.

Long-term memory usually works by **writing** salient information out and later
**retrieving** the relevant pieces back into context — RAG applied to the agent's
own history.

## Persistence and checkpointing

Frameworks like **LangGraph** persist the full graph **state** per conversation
("thread") with a **checkpointer**. With a durable backend (e.g. SQLite or
Postgres), a conversation survives restarts and can be resumed exactly where it
paused — which is also what makes **human-in-the-loop** interrupts possible.

## Design notes

- Decide *what* is worth remembering; storing everything adds noise and cost.
- Key memories by user/thread so different users don't share state.
- Memory retrieval has the same precision/recall concerns as any RAG retrieval.
