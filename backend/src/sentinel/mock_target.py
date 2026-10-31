"""Independent local HTTP decision service used to exercise black-box audits."""

from __future__ import annotations

from threading import Lock
from typing import Literal

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, FiniteFloat, Field, model_validator

from sentinel.data.welfare import FEATURE_NAMES
from sentinel.target.registry import DEMO_TARGET_ID, load_demo_target

MODEL_VERSION = "synthetic-welfare-v1"
_target_lock = Lock()
_target = None


def _get_target():
    """Load/unpickle the model once per service process, even on concurrent cold requests."""
    global _target
    if _target is None:
        with _target_lock:
            if _target is None:
                _target, _ = load_demo_target()
    return _target


class DecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    features: dict[str, FiniteFloat]

    @model_validator(mode="after")
    def validate_features(self) -> "DecisionRequest":
        expected = set(FEATURE_NAMES)
        received = set(self.features)
        if received != expected:
            missing = sorted(expected - received)
            unknown = sorted(received - expected)
            raise ValueError(f"feature schema mismatch; missing={missing}, unknown={unknown}")
        return self


class DecisionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    model_id: str
    model_version: str
    decision: Literal["eligible", "ineligible"]
    probability_eligible: float = Field(ge=0, le=1, allow_inf_nan=False)
    reason: str | None = Field(default=None, max_length=256)


app = FastAPI(
    title="SENTINEL Local Mock Decision Service",
    version=MODEL_VERSION,
    description="A separate HTTP process around SENTINEL's synthetic demo model.",
)


class DecisionBodyLimitMiddleware:
    """ASGI body-size bound that also handles chunked requests without a length."""

    def __init__(self, app, max_bytes: int = 8192):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("path") != "/api/v1/decide":
            return await self.app(scope, receive, send)

        chunks: list[bytes] = []
        total = 0
        more_body = True
        while more_body:
            event = await receive()
            if event["type"] == "http.disconnect":
                return
            chunk = event.get("body", b"")
            total += len(chunk)
            if total > self.max_bytes:
                body = b'{"detail":"Request too large"}'
                await send({"type": "http.response.start", "status": 413, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
                await send({"type": "http.response.body", "body": body})
                return
            chunks.append(chunk)
            more_body = event.get("more_body", False)

        iterator = iter(chunks)

        async def replay_body():
            try:
                chunk = next(iterator)
                return {"type": "http.request", "body": chunk, "more_body": True}
            except StopIteration:
                return {"type": "http.request", "body": b"", "more_body": False}

        return await self.app(scope, replay_body, send)


app.add_middleware(DecisionBodyLimitMiddleware)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model_id": DEMO_TARGET_ID, "model_version": MODEL_VERSION}


@app.post("/api/v1/decide", response_model=DecisionResponse)
def decide(request: DecisionRequest) -> DecisionResponse:
    try:
        target = _get_target()
        record = np.asarray(
            [[request.features[name] for name in FEATURE_NAMES]], dtype=float
        )
        result = target.decide(record)
        probability = result.confidence if result.eligible else 1.0 - result.confidence
        return DecisionResponse(
            model_id=DEMO_TARGET_ID,
            model_version=MODEL_VERSION,
            decision="eligible" if result.eligible else "ineligible",
            probability_eligible=float(probability),
            reason=result.stated_reason_text,
        )
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=422, detail="Invalid decision input") from exc
    except Exception:
        # Do not return exception text, paths, environment or model internals.
        raise HTTPException(status_code=503, detail="Decision service unavailable") from None
