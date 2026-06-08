# LangChain

## What It Is
LangChain is an open-source framework for building applications powered by large
language models. It provides standard interfaces and composable building blocks
so you can swap models, retrievers, and tools without rewriting your app. The
ecosystem is split into focused packages: `langchain-core` (base abstractions),
provider integrations (e.g., `langchain-huggingface`, `langchain-openai`),
`langchain-community` (community integrations), and `langchain` (higher-level
chains and agents).

## Core Abstractions
- **Chat models** implement a common `BaseChatModel` interface, so application
  code is provider-agnostic — switching from one model to another is a config
  change, not a rewrite.
- **Prompt templates** parameterise prompts and support chat-style messages.
- **Output parsers** convert raw model text into structured data (e.g.,
  `PydanticOutputParser`, `JsonOutputParser`, `StrOutputParser`).
- **Retrievers** expose a uniform `invoke(query) -> list[Document]` interface
  over any vector store or search backend.
- **Document loaders & text splitters** handle ingestion and chunking.
- **Tools** wrap functions the model can call.

## LangChain Expression Language (LCEL)
LCEL lets you compose components with the pipe operator into a single
`Runnable`:

    chain = prompt | llm | output_parser
    result = chain.invoke({"question": "..."})

Every Runnable supports `invoke`, `batch`, `stream`, and their async variants
for free, plus retries, fallbacks, and parallelism. This composability is the
heart of modern LangChain: small, testable units wired into pipelines.

## Structured Output
Two approaches: native function/tool-calling via `with_structured_output`, or
prompt-engineered JSON parsed by `PydanticOutputParser`. Native tool-calling is
convenient on models that support it, but many open-weight models served over
free inference do not implement OpenAI-style tool-calling reliably. In those
cases, prompt-based JSON with a validating parser (and a safe fallback) is more
portable.

## Where LangChain Stops and LangGraph Begins
LCEL chains are directed and acyclic — great for linear pipelines. When an
application needs cycles, branching, shared mutable state, persistence, or
human-in-the-loop pauses, you reach for **LangGraph**, which models the
application as a stateful graph rather than a straight-through chain.
