# syntax=docker/dockerfile:1
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# 1) Install dependencies first so this layer caches across code changes.
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# 2) Copy the project and install the package itself (editable so PROJECT_ROOT
#    resolves to /app and data/ + storage/ live alongside the code).
COPY . .
RUN pip install -e . --no-deps

EXPOSE 8000 8501

# Default to the API, binding to $PORT when the platform provides one (Render,
# Cloud Run, …) and falling back to 8000 locally. Shell form so $PORT expands.
CMD ["sh", "-c", "uvicorn agentic_rag.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
