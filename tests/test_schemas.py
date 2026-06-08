"""Structured-output schemas parse and validate as expected."""

from __future__ import annotations

import pytest
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import ValidationError

from agentic_rag import schemas


def test_route_query_accepts_valid_datasource():
    assert schemas.RouteQuery(datasource="vectorstore").datasource == "vectorstore"
    assert schemas.RouteQuery(datasource="web_search").datasource == "web_search"


def test_route_query_rejects_invalid_datasource():
    with pytest.raises(ValidationError):
        schemas.RouteQuery(datasource="nonsense")


@pytest.mark.parametrize(
    "model",
    [schemas.GradeDocuments, schemas.GradeHallucinations, schemas.GradeAnswer],
)
def test_binary_graders_reject_invalid_scores(model):
    assert model(binary_score="yes").binary_score == "yes"
    with pytest.raises(ValidationError):
        model(binary_score="maybe")


def test_pydantic_parser_roundtrip():
    parser = PydanticOutputParser(pydantic_object=schemas.GradeDocuments)
    parsed = parser.parse('{"binary_score": "no"}')
    assert parsed.binary_score == "no"


def test_format_instructions_describe_schema():
    parser = PydanticOutputParser(pydantic_object=schemas.GradeHallucinations)
    instructions = parser.get_format_instructions()
    assert "binary_score" in instructions
