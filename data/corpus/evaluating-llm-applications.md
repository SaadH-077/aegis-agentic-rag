# Evaluating LLM Applications

## Why Evaluation Is Hard
LLM outputs are open-ended, so there is rarely a single correct string to match.
The same answer can be phrased countless ways, and quality has multiple
dimensions: correctness, relevance, groundedness, completeness, tone, and
safety. Evaluation must therefore be systematic and multi-faceted rather than a
single accuracy number.

## Build a Dataset First
Effective evaluation starts with a curated dataset of representative examples,
each with an input and (where possible) a reference answer. Cover the common
cases, the edge cases, and the known failure modes. Datasets grow over time:
interesting or failing production traces become new test cases.

## Evaluator Types
- **Heuristic / rule-based:** exact match, regex, JSON-schema validity, numeric
  tolerance, embedding-distance to a reference. Cheap, deterministic, limited.
- **LLM-as-judge:** a model scores an output against a rubric or reference.
  Flexible and well-suited to open-ended text, but must be designed carefully
  (clear rubric, low temperature) and validated against human judgement.
- **Human evaluation:** the gold standard for nuanced quality; expensive, so
  usually reserved for spot checks and calibrating automatic evaluators.

## RAG-Specific Metrics
RAG systems are evaluated on both retrieval and generation:
- **Context relevance / precision:** were the retrieved chunks actually relevant?
- **Faithfulness / groundedness:** is every claim in the answer supported by the
  retrieved context (i.e., no hallucination)?
- **Answer relevance:** does the answer address the question?
- **Context recall:** did retrieval find the information needed to answer?
Frameworks like RAGAS formalise several of these metrics.

## Offline vs. Online
**Offline** evaluation runs your app over a fixed dataset and scores it — ideal
for catching regressions in CI before deploying. **Online** evaluation observes
real traffic: collect user feedback (thumbs up/down, corrections), monitor
latency and cost, and sample live traces for review.

## Experiments and Regression Testing
Treat each prompt change, model swap, or retrieval tweak as an experiment: run
it against the dataset, compare scores to the previous version, and only ship if
the metrics improve (or at least do not regress). Tooling such as LangSmith makes
this loop — dataset, evaluators, experiment comparison — repeatable and
shareable across a team.

## Pitfalls
Tiny datasets that do not represent real usage; LLM judges that are biased toward
verbose or sycophantic answers; optimising a single metric while quietly
regressing another; and never validating the automatic judge against human
ratings.
