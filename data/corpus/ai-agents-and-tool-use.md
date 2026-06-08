# AI Agents and Tool Use

An **LLM agent** is a system where a language model decides *which actions to
take*, observes the results, and iterates toward a goal — rather than producing a
single response. The model becomes a reasoning controller over external tools.

## Tools (function calling)

A **tool** is a function the model can call: web search, a calculator, a database
query, a code interpreter, or a retrieval step. Modern LLMs support **function /
tool calling**: given a schema of available tools, the model emits a structured
call (tool name + JSON arguments). The runtime executes it and returns the result
as an observation.

Tool calling turns a text generator into something that can act on the world and
ground its answers in fresh, authoritative data.

## The ReAct pattern

**ReAct** (Reason + Act) interleaves *thoughts*, *actions*, and *observations*:

```
Thought: I need the current population of France.
Action: web_search("population of France 2024")
Observation: ~68 million.
Thought: I can now answer.
Answer: France has roughly 68 million people.
```

This loop lets the model break a problem into steps, call tools, and self-correct
based on what it sees.

## Planning and control

- **ReAct / single-loop** — think-act-observe until done. Simple and flexible.
- **Plan-and-execute** — first draft a multi-step plan, then execute each step
  (optionally re-planning). Better for long tasks.
- **Reflection** — the agent critiques its own output and retries, improving
  reliability.

## Reliability concerns

Agents add power but also failure modes: infinite loops, wrong tool choices,
and compounding errors. Production agents bound the number of steps, validate
tool outputs, add **human-in-the-loop** approval for risky actions, and trace
every step for debugging. Frameworks like **LangGraph** model the agent as an
explicit state machine to make this control flow reliable and inspectable.
