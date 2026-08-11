"""SENTINEL HTTP API.

Route groups map onto the trust boundary:

- ``/auth``    -- obtain an auditor identity (M4)
- ``/audits``  -- run audits; authenticated, rate-limited, budget-checked (M1/M2/M4/M5)
- ``/ledger``  -- sealed reports and their status (M3)
- ``/verify``  -- PUBLIC. Independent verification, no authentication.

``/verify`` is deliberately unauthenticated. The point of a tamper-evident
ledger is that a skeptical reader can check a report without an account, without
our permission, and without trusting us -- gating it would defeat it.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sentinel.api.routes import audits, auth, ledger, verify


def create_app() -> FastAPI:
    app = FastAPI(
        title="SENTINEL",
        version="0.1.0",
        description=(
            "Independent trust verification for public-sector AI systems. "
            "Audits a target system using query access only -- no model "
            "internals, no training data."
        ),
    )

    # Scoped to the local dev frontend rather than "*". A wildcard here would
    # let any site a logged-in auditor visits drive their token against this
    # API; the deployment sets its real origin explicitly.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )

    app.include_router(auth.router)
    app.include_router(audits.router)
    app.include_router(ledger.router)
    app.include_router(verify.router)

    @app.get("/health", tags=["meta"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
