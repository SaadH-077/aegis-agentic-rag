"""LCEL chain factories — one composable Runnable per reasoning step.

Each factory takes an injected ``BaseChatModel`` (provider-agnostic) and returns
a chain built with the LangChain Expression Language (``prompt | llm | parser``).
Structured steps use ``PydanticOutputParser`` so the JSON schema is injected into
the prompt and the output is validated into a typed object.

Injecting the LLM keeps everything unit-testable: tests swap in a fake chat
model and assert the wiring without any network calls.
"""

from __future__ import annotations

from langchain_core.language_models import BaseChatModel
from langchain_core.output_parsers import PydanticOutputParser, StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable

from . import prompts, schemas


def _structured(llm: BaseChatModel, prompt: ChatPromptTemplate, schema: type) -> Runnable:
    """Build a ``prompt | llm | PydanticOutputParser`` chain for *schema*."""
    parser = PydanticOutputParser(pydantic_object=schema)
    prompt_with_schema = prompt.partial(format_instructions=parser.get_format_instructions())
    return prompt_with_schema | llm | parser


def build_router_chain(llm: BaseChatModel) -> Runnable:
    return _structured(llm, prompts.ROUTER_PROMPT, schemas.RouteQuery)


def build_doc_grader_chain(llm: BaseChatModel) -> Runnable:
    return _structured(llm, prompts.DOC_GRADER_PROMPT, schemas.GradeDocuments)


def build_hallucination_chain(llm: BaseChatModel) -> Runnable:
    return _structured(llm, prompts.HALLUCINATION_PROMPT, schemas.GradeHallucinations)


def build_answer_grader_chain(llm: BaseChatModel) -> Runnable:
    return _structured(llm, prompts.ANSWER_GRADER_PROMPT, schemas.GradeAnswer)


def build_generation_chain(llm: BaseChatModel) -> Runnable:
    """RAG answer generation — returns a plain string."""
    return prompts.GENERATION_PROMPT | llm | StrOutputParser()


def build_query_rewriter_chain(llm: BaseChatModel) -> Runnable:
    return prompts.QUERY_REWRITER_PROMPT | llm | StrOutputParser()


def build_contextualize_chain(llm: BaseChatModel) -> Runnable:
    return prompts.CONTEXTUALIZE_PROMPT | llm | StrOutputParser()


def build_direct_answer_chain(llm: BaseChatModel) -> Runnable:
    """Conversational / identity replies (greetings, 'what can you do')."""
    return prompts.DIRECT_ANSWER_PROMPT | llm | StrOutputParser()


def build_fallback_answer_chain(llm: BaseChatModel) -> Runnable:
    """Answer from the model's own knowledge when web search is declined."""
    return prompts.FALLBACK_ANSWER_PROMPT | llm | StrOutputParser()
