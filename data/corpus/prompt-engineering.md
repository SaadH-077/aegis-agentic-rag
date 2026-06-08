# Prompt Engineering

## What It Is
Prompt engineering is the practice of designing the inputs to an LLM to reliably
get the behaviour you want. Because an LLM's output is conditioned entirely on
its prompt (plus its weights), how you phrase instructions, structure context,
and constrain the output format has a large effect on quality, consistency, and
cost.

## Core Techniques
- **Clear instructions and role setting:** state the task, constraints, and the
  desired output format explicitly. A focused system prompt establishes
  behaviour for the whole conversation.
- **Few-shot prompting:** include a handful of input/output examples to
  demonstrate the pattern; often dramatically improves consistency over
  zero-shot.
- **Chain-of-thought (CoT):** ask the model to reason step by step before
  answering for multi-step problems. Reasoning can be hidden from the final
  output when only the conclusion is needed.
- **Output formatting:** request strict JSON or a schema when the result feeds
  downstream code; pair with a parser that validates and, if needed, repairs the
  output.
- **Decomposition:** break a hard task into smaller prompted steps (this is
  effectively what an agent graph does).

## Grounding and Anti-Hallucination
For factual tasks, supply the relevant context in the prompt (as in RAG) and
instruct the model to answer *only* from that context and to say when it does not
know. Explicitly forbidding fabrication and asking for citations reduces
hallucination.

## Structured Output on Open Models
Two paths: native function/tool-calling (`with_structured_output`) where
supported, or prompt-engineered JSON parsed with a validating parser. Many
open-weight models served over free inference do not implement tool-calling
reliably, so embedding the JSON schema in the prompt and parsing/validating the
response — with a safe fallback on parse failure — is the more portable choice.

## Parameters That Shape Output
- **Temperature:** higher = more random/creative, lower = more deterministic.
  Use low temperature for graders, routers, and extraction.
- **Top-p / top-k:** nucleus and top-k sampling control the candidate token pool.
- **Max tokens:** caps output length (and cost).

## Iteration and Evaluation
Prompts should be versioned and evaluated like code. Change one thing at a time,
run the new prompt against an evaluation dataset, and keep it only if metrics
improve. Treating prompts as first-class, testable artifacts is what separates
reliable systems from brittle demos.
