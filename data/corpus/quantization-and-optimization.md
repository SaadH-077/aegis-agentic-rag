# Quantization and Inference Optimization

Large models are expensive to serve. **Quantization** and related optimizations
shrink memory use and speed up inference, often with minimal quality loss — the
techniques that make it practical to run capable models on modest hardware.

## Quantization

Model weights are usually stored in 16-bit floats (FP16/BF16). **Quantization**
represents them with fewer bits — 8-bit (INT8), 4-bit, or lower — cutting memory
roughly proportionally and speeding up memory-bound inference.

- **Post-training quantization (PTQ)** — quantize an already-trained model. Fast,
  no retraining. Methods include **GPTQ** and **AWQ** (activation-aware), which
  preserve quality by protecting the most important weights.
- **Quantization-aware training (QAT)** — simulate quantization during training
  for the best accuracy at very low bit-widths, at higher cost.
- **GGUF** — a popular file format (used by llama.cpp) packaging quantized weights
  for CPU/GPU inference on consumer machines.

Lower bit-widths save more memory but risk more accuracy loss; 4-bit is a common
sweet spot for local inference.

## KV cache

During generation, attention reuses the keys and values of previous tokens. The
**KV cache** stores them so each new token doesn't recompute the whole sequence —
essential for fast autoregressive decoding. Its size grows with context length
and batch size and often dominates memory; **KV-cache quantization** and
attention variants (e.g. grouped-query attention) reduce it.

## Throughput techniques

- **Continuous batching** — dynamically merge requests so the GPU stays busy
  (used by serving stacks like vLLM).
- **PagedAttention** — manages the KV cache in pages to avoid fragmentation and
  fit more concurrent requests.
- **Speculative decoding** — a small draft model proposes tokens that the large
  model verifies in parallel, reducing latency.

## Takeaway

Quantization reduces *memory and cost*; batching and caching improve
*throughput and latency*. Together they decide how cheaply and quickly a model
can serve — a core concern for any production LLM application.
