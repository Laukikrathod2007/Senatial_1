# SENTINEL backend.
#
# Note: the demo is driven from the CLI, not from this container. Docker is the
# deployment artifact (docs 3.2) and the "how would you actually run this"
# answer -- it is deliberately not on the critical path of a live presentation.

FROM python:3.12-slim

# uv, pinned by digest-free copy from the official distroless image so the
# build does not depend on a curl|sh installer at image-build time.
COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /uvx /bin/

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

# Dependencies first, in their own layer: they change far less often than the
# source, so edits to sentinel/ do not trigger a full reinstall.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY src/ ./src/
COPY README.md ./
RUN uv sync --frozen --no-dev

# Artifacts are deliberately NOT copied into the image. The cached shadow
# ensemble alone is ~428 MB, which would make the image impractical to build,
# push, or rebuild. They are bind-mounted read-only at run time instead (see
# docker-compose.yml); if absent, the engines regenerate them on first use.

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

# No --reload: it watches the filesystem and doubles memory for no benefit here.
CMD ["uvicorn", "sentinel.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
