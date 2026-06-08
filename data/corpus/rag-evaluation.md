# Evaluating RAG Systems

A RAG system has two parts that can each fail: **retrieval** (did we fetch the
right context?) and **generation** (did the model use it faithfully and answer
the question?). Good evaluation measures both, separately and end-to-end.

## Retrieval metrics

- **Context recall** — of the information needed to answer, how much appears in
  the retrieved chunks? Low recall means the answer simply isn't available.
- **Context precision** — of the retrieved chunks, how many are actually
  relevant? Low precision feeds the model distractors.
- Classic IR metrics also apply: **hit rate**, **MRR** (mean reciprocal rank),
  and **nDCG** when you have graded relevance labels.

## Generation metrics

- **Faithfulness / groundedness** — are the claims in the answer supported by the
  retrieved context, or did the model hallucinate?
- **Answer relevance** — does the answer actually address the question asked?
- **Correctness** — does it match a reference/ground-truth answer?

## LLM-as-judge

Many of these are graded by an **LLM-as-judge**: a strong model scores an answer
against the question and context using a rubric. It is scalable and correlates
well with humans, but should be validated against human labels and used with
care (judges have biases, e.g. for length or position).

## Tooling

- **RAGAS** — a popular open-source library implementing faithfulness, answer
  relevance, context precision/recall, and more, without requiring ground-truth
  for some metrics.
- **LangSmith** — datasets + evaluators to run experiments over many examples,
  track scores across versions, and inspect individual traces.

## Practice

Build a small, representative **evaluation set** early, score every change
against it, and separate retrieval failures from generation failures — fixing the
wrong half is the most common RAG debugging mistake.
