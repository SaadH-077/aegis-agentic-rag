# The Model Context Protocol (MCP)

The **Model Context Protocol (MCP)** is an open standard for connecting LLM
applications to external **tools, data, and prompts** through a uniform
interface. It is often described as "a USB-C port for AI" — one protocol so any
compliant client can talk to any compliant server.

## The problem it solves

Before MCP, every integration (a database, a file system, a SaaS API) was a
bespoke connector wired into each application. That is an N×M problem: N apps
times M tools. MCP standardises the contract so a tool is built **once** as a
server and reused by **any** MCP-aware host.

## Architecture

- **Host** — the LLM application the user interacts with (an IDE assistant, a
  chat app, an agent).
- **Client** — lives inside the host and maintains a connection to one server.
- **Server** — exposes capabilities over the protocol.

## What a server exposes

- **Tools** — functions the model can call (e.g. "query database", "send
  message"). These power agentic actions.
- **Resources** — read-only data the host can load into context (files, records).
- **Prompts** — reusable, parameterised prompt templates.

Communication uses JSON-RPC, over local transports (stdio) or network transports.

## Why it matters

MCP decouples *what an agent can do* from *who built the agent*. Tool authors
publish servers; application builders consume them without custom glue. It is a
key enabler for an ecosystem of interoperable, composable AI tools, and reflects
the broader shift from single-prompt apps toward tool-using agents.
