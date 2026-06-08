# LLM Inference and Serving

## Hosted vs. Local Inference
You can run an LLM in two broad ways. **Hosted inference** calls a model running
on someone else's hardware via an API (for example, Hugging Face Inference
Providers, Groq, or other cloud providers) — no local GPU or disk needed, but you
depend on availability, rate limits, and (beyond any free tier) cost. **Local
inference** runs the model on your own machine (e.g., via Ollama or
llama.cpp) — free and private, but it requires enough RAM/VRAM and disk to hold
the model weights.

## The Generation Loop and KV-Cache
Decoder-only LLMs generate one token at a time, feeding each new token back in.
To avoid recomputing attention over the whole prefix every step, models cache
the keys and values of previous tokens (the **KV-cache**). This makes generation
roughly linear in output length but means memory grows with context length.

## Context Windows
The context window is the maximum number of tokens (prompt + generation) the
model can attend to. Exceeding it truncates or errors. Long contexts cost more
and can suffer from the "lost in the middle" effect, where information in the
middle of a long prompt is under-used. RAG helps by retrieving only the most
relevant chunks instead of stuffing everything in.

## Quantization
Quantization stores weights at lower precision (e.g., 8-bit or 4-bit instead of
16-bit) to shrink memory and speed up inference, with a small quality cost.
Formats like GGUF (for llama.cpp/Ollama) and methods like GPTQ and AWQ make it
practical to run capable models on modest hardware.

## Latency, Throughput, and Cost
- **Time to first token (TTFT)** and **tokens per second** characterise
  responsiveness. Specialised inference stacks (e.g., vLLM) and hardware (e.g.,
  Groq's LPUs) optimise these.
- **Throughput** matters when serving many users; batching requests improves it.
- **Cost** on hosted APIs is usually billed per token (input + output), so
  prompt length, retrieval size, and the number of LLM calls per request all
  drive spend.

## Practical Implications for Agentic Apps
An agent that makes several LLM calls per question (route, grade, generate,
self-check) multiplies token cost and latency. Mitigations include using a small
fast model for cheap graders, caching identical calls, limiting retrieved chunks,
and bounding retry loops. Designing for these constraints is a core LLM
engineering skill, especially when running on a free tier.
