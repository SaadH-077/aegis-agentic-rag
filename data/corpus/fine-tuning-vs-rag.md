# Fine-Tuning vs. RAG

When a base LLM doesn't behave the way you need, two main levers exist:
**Retrieval-Augmented Generation (RAG)** and **fine-tuning**. They solve
different problems and are often combined.

## What each is good for

- **RAG** injects *knowledge* at inference time by retrieving relevant documents
  into the prompt. Use it when the model needs facts it doesn't reliably know,
  especially knowledge that **changes often** or is **private/proprietary**.
  Updating knowledge means re-indexing documents — no retraining.
- **Fine-tuning** adjusts the model's *weights* on example data. Use it to change
  **behaviour, format, style, or task skill** — e.g. always answering in a house
  voice, following a strict JSON schema, or mastering a narrow classification
  task. It bakes patterns in, but does not reliably teach new facts.

A useful rule of thumb: **RAG for knowledge, fine-tuning for behaviour.**

## Parameter-efficient fine-tuning (PEFT)

Full fine-tuning updates all weights and is expensive. **PEFT** methods update a
tiny fraction instead:

- **LoRA (Low-Rank Adaptation)** — freezes the base model and trains small
  low-rank "adapter" matrices injected into the attention/MLP layers. Cheap,
  fast, and swappable.
- **QLoRA** — LoRA on top of a **quantized** (e.g. 4-bit) base model, so large
  models can be fine-tuned on a single consumer GPU.

## Choosing (and combining)

- Need fresh or private facts, with citations? → **RAG**.
- Need a consistent format, tone, or a specialised skill? → **fine-tuning**.
- Need both? Fine-tune for behaviour and wrap it in RAG for knowledge.

Start with prompting, then RAG, and reach for fine-tuning only when prompting and
retrieval cannot get you there — it is the most operationally expensive option.
