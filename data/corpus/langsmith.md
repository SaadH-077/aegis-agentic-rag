# LangSmith

## What It Is
LangSmith is a platform for **observability, testing, and evaluation** of LLM
applications. It complements LangChain and LangGraph (and works with any stack)
by recording detailed traces of every run, providing datasets and evaluators for
systematic quality measurement, and supporting human feedback collection. Its
purpose is to turn "it seems to work" into measurable, debuggable engineering.

## Tracing
When tracing is enabled (via environment variables such as `LANGSMITH_TRACING`,
`LANGSMITH_API_KEY`, and `LANGSMITH_PROJECT`), LangChain and LangGraph emit a
trace for each invocation automatically. A trace is a tree of **runs**: the
top-level chain/graph and every nested step — each LLM call with its exact
prompt, the retrieved documents, latency, token counts, and any errors. For an
agent with loops and branches, this is invaluable for seeing exactly which path
executed and why.

## Datasets
A dataset is a collection of examples, each with inputs and (optionally)
reference outputs. Datasets can be curated by hand, imported from files, or
built from interesting production traces. They are the foundation for repeatable
evaluation: you run your application over the dataset and score the results.

## Evaluation
LangSmith runs your application (the "target") over a dataset and applies
**evaluators** to score each output. Evaluators can be:
- **Heuristic** (exact match, regex, JSON validity, embedding distance).
- **LLM-as-judge**, where a model scores correctness, relevance, or groundedness
  against the reference or the retrieved context.
- **Human**, via the annotation UI.

Each evaluation run is an **experiment**; comparing experiments lets you measure
whether a prompt change, model swap, or retrieval tweak actually improved
quality — and catch regressions before they ship.

## Feedback and Monitoring
In production, LangSmith collects feedback (thumbs up/down, scores, corrections)
attached to traces, and dashboards track latency, cost, and error rates over
time. This closes the loop: observe real behaviour, curate hard cases into a
dataset, evaluate fixes, and deploy with confidence.

## Why Recruiters Care
Building an LLM app is easy; knowing whether it is *good* is the hard,
senior-level skill. Demonstrating tracing plus a real evaluation suite signals
that you can measure and improve LLM systems, not just prototype them.
