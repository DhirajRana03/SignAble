FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8001

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        poppler-utils \
        build-essential \
        libfreetype6 \
        libjpeg62-turbo \
        zlib1g \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev --frozen || uv sync --no-dev

COPY src/ ./src/

EXPOSE 8001

# Bind to $PORT for Railway/Render which inject the port at runtime.
CMD ["sh", "-c", "uv run uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
