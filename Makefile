# Convenience targets. On Windows, run the underlying commands directly if you
# don't have `make` (each recipe is a single shell command).

.PHONY: help install install-dev ingest api ui test lint fmt eval docker-build up down clean

help:
	@echo "install      Install the package"
	@echo "install-dev  Install with dev/test tooling"
	@echo "ingest       Build the FAISS knowledge base"
	@echo "api          Run the FastAPI backend (http://localhost:8000/docs)"
	@echo "ui           Run the Streamlit UI (http://localhost:8501)"
	@echo "test         Run the offline test suite"
	@echo "lint         Lint with ruff"
	@echo "fmt          Format with ruff"
	@echo "eval         Run the LangSmith evaluation experiment"
	@echo "up / down    Start / stop the full Docker stack"

install:
	pip install -e .

install-dev:
	pip install -e ".[dev]"

ingest:
	python -m agentic_rag.ingest

api:
	uvicorn agentic_rag.api.main:app --host 0.0.0.0 --port 8000 --reload

ui:
	streamlit run app/streamlit_app.py

test:
	pytest -q

lint:
	ruff check .

fmt:
	ruff format .

eval:
	python eval/run_eval.py

docker-build:
	docker compose build

up:
	docker compose up --build

down:
	docker compose down
