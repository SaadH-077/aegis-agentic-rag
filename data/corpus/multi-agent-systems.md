# Multi-Agent Systems

A **multi-agent system** decomposes a problem across several specialised LLM
agents that collaborate, instead of relying on one monolithic agent. Each agent
has a focused role, its own prompt, and often its own tools.

## Why use multiple agents?

- **Separation of concerns** — a "researcher" agent gathers information, a
  "writer" agent drafts, a "critic" agent reviews. Smaller, focused prompts are
  easier to steer and debug than one giant prompt.
- **Specialised tools** — a coding agent gets a code interpreter; a data agent
  gets SQL access.
- **Parallelism** — independent subtasks can run concurrently.

## Common topologies

- **Supervisor (router)** — a central agent receives the task and delegates to
  worker agents, collecting and combining their outputs. The supervisor decides
  who acts next.
- **Hierarchical** — supervisors of supervisors, for complex workflows.
- **Network / collaborative** — agents hand off to one another peer-to-peer based
  on the conversation state.

## Handoffs and shared state

Agents coordinate through a **shared state** (the conversation, scratchpad, or a
blackboard) and **handoffs** — one agent transferring control (and context) to
another. Designing the state schema and the handoff rules is the core of building
a reliable multi-agent system.

## Trade-offs

Multi-agent designs add latency and cost (more LLM calls) and new failure modes
(agents talking past each other, loops). They shine on complex, decomposable
tasks; for simple tasks a single well-prompted agent is usually better. Graph
frameworks such as **LangGraph** express multi-agent control flow as nodes and
edges with explicit, debuggable state transitions.
