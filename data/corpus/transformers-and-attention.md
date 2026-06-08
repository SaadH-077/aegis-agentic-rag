# Transformers and the Attention Mechanism

## Overview
The Transformer is a neural network architecture introduced in the 2017 paper
"Attention Is All You Need". It replaced recurrence (RNNs/LSTMs) with a pure
attention-based design, enabling massively parallel training and far better
modelling of long-range dependencies. It is the foundation of virtually every
modern large language model (LLM), including the GPT, Llama, Mistral, and Qwen
families.

## Self-Attention
Self-attention lets each token in a sequence attend to every other token to
build a context-aware representation. For each token the model computes three
vectors via learned projections: a **Query (Q)**, a **Key (K)**, and a
**Value (V)**. Attention scores are computed as the scaled dot product of
queries with keys, passed through a softmax, and used to take a weighted sum of
the values:

    Attention(Q, K, V) = softmax(QKᵀ / √dₖ) V

The √dₖ scaling keeps dot products from growing too large and destabilising the
softmax gradients.

## Multi-Head Attention
Rather than a single attention function, Transformers use several attention
"heads" in parallel, each with its own Q/K/V projections. Different heads can
specialise in different relationships (syntax, coreference, position). Their
outputs are concatenated and linearly projected back to the model dimension.

## Positional Encoding
Because attention is permutation-invariant, the model has no inherent notion of
order. Positional information is injected either with fixed sinusoidal
encodings (original paper) or learned/relative schemes. Modern LLMs commonly use
**Rotary Position Embeddings (RoPE)**, which rotate Q/K vectors by an angle
proportional to position and generalise better to longer contexts.

## Architecture Blocks
A Transformer block stacks: multi-head self-attention, a position-wise
feed-forward network (usually two linear layers with a non-linearity), residual
connections around each sub-layer, and layer normalisation. Decoder-only LLMs
use **causal (masked) attention** so a token can only attend to earlier tokens,
which is what enables left-to-right autoregressive generation.

## Why It Matters for LLM Engineers
Understanding attention explains practical realities: the quadratic cost of
attention in sequence length (motivating techniques like FlashAttention,
sliding-window attention, and KV-caching), why context windows are finite, and
why prompt position can affect what the model attends to.
