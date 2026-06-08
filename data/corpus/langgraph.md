# LangGraph

## What It Is
LangGraph is a library for building stateful, multi-step LLM applications as
**graphs**. Where an LCEL chain is a straight line, a LangGraph application is a
set of nodes connected by edges that can branch and loop, all operating over a
shared, typed **state**. It is the right tool for agents, multi-step reasoning,
and any workflow with cycles or conditional control flow.

## State
The graph is parameterised by a state schema, usually a `TypedDict`. Each node
receives the current state and returns a partial update. Channels can define a
**reducer** to control how updates merge — for example, `add_messages` appends
to a message list (conversation memory), while the default reducer overwrites a
value.

## Nodes and Edges
- **Nodes** are plain functions (or Runnables) that read state and return
  updates.
- **Normal edges** connect one node unconditionally to the next.
- **Conditional edges** call a routing function that inspects the state and
  returns the name of the next node, enabling branching and loops.
- Special `START` and `END` sentinels mark entry and exit.

## Cycles and Control Flow
Because edges can point backward, LangGraph naturally expresses retry loops and
self-correction: generate an answer, grade it, and route back to regenerate or
rewrite the query if the grade fails. A recursion limit guards against infinite
loops.

## Persistence and Memory
Compiling a graph with a **checkpointer** (e.g., an in-memory saver or a SQLite
saver) persists state per `thread_id`. This gives you durable conversation
memory across turns and the ability to pause and resume a run exactly where it
left off.

## Human-in-the-Loop (HITL)
Calling the `interrupt()` function inside a node pauses the graph and surfaces a
payload to the caller. The application collects a human decision and resumes by
invoking the graph again with `Command(resume=value)`, which becomes the return
value of `interrupt()`. This enables approval gates, edits, and review steps
mid-execution — for instance, requiring human approval before the agent calls an
external tool or performs a web search.

## Typical Agent Patterns
LangGraph is commonly used to implement ReAct-style tool-using agents, multi-
agent supervisors that route work to specialists, and advanced RAG flows such as
Adaptive RAG, Corrective RAG (CRAG), and Self-RAG.
