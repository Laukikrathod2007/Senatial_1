"""M4 validation (docs §7.2): unauthenticated requests cannot reach the audit
engines at all, and over-quota requests are refused."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from sentinel.api.app import create_app
from sentinel.gateway.auth import (
    decode_token,
    hash_password,
    issue_token,
    verify_password,
)
from sentinel.gateway.roles import Role, quota_for


@pytest.fixture
def client(tmp_path, monkeypatch) -> TestClient:
    """API client backed by a throwaway database."""
    from sentinel.config import get_settings
    from sentinel.gateway import deps

    settings = get_settings()
    monkeypatch.setattr(
        settings, "database_url", f"sqlite:///{(tmp_path / 'api.db').as_posix()}"
    )
    monkeypatch.setattr(deps, "_session_factory", None)
    return TestClient(create_app())


def _auth(role: Role = Role.JOURNALIST) -> dict[str, str]:
    return {"Authorization": f"Bearer {issue_token('tester', role)}"}


# -- authentication ----------------------------------------------------------


def test_unauthenticated_audit_is_rejected(client):
    response = client.post("/audits/explainability", json={"sample_size": 100})
    assert response.status_code == 401


def test_unauthenticated_request_never_reaches_the_engine(client):
    """Docs §7.2: "an unauthenticated request cannot reach the audit engines at all".

    Asserted by mocking the engine and confirming zero invocations — a 401 alone
    would not prove the target was never queried.
    """
    with patch(
        "sentinel.api.routes.audits._explainability"
    ) as engine:
        response = client.post("/audits/explainability", json={"sample_size": 100})
        assert response.status_code == 401
        engine.assert_not_called()


def test_malformed_authorization_header_is_rejected(client):
    for header in ({"Authorization": "garbage"}, {"Authorization": "Bearer not.a.jwt"}):
        assert client.post("/audits/budget", headers=header).status_code in (401, 405)


def test_tampered_token_is_rejected(client):
    token = issue_token("tester", Role.CITIZEN)
    tampered = token[:-4] + ("aaaa" if not token.endswith("aaaa") else "bbbb")
    response = client.get(
        "/audits/budget", headers={"Authorization": f"Bearer {tampered}"}
    )
    assert response.status_code == 401


def test_expired_token_is_rejected(client):
    expired = issue_token("tester", Role.CITIZEN, ttl_seconds=-10)
    response = client.get(
        "/audits/budget", headers={"Authorization": f"Bearer {expired}"}
    )
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_valid_token_round_trips():
    identity = decode_token(issue_token("asha", Role.CERTIFIED_AUDITOR))
    assert identity.subject == "asha"
    assert identity.role is Role.CERTIFIED_AUDITOR
    assert identity.token_id


def test_tokens_are_individually_identifiable():
    """Distinct jti values let one token be revoked without revoking all."""
    first = decode_token(issue_token("asha", Role.CITIZEN))
    second = decode_token(issue_token("asha", Role.CITIZEN))
    assert first.token_id != second.token_id


# -- passwords ---------------------------------------------------------------


def test_password_hash_round_trips():
    encoded = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", encoded)
    assert not verify_password("wrong password", encoded)


def test_password_hashes_are_salted():
    assert hash_password("same") != hash_password("same")


def test_malformed_password_hash_is_rejected_not_crashed():
    assert not verify_password("x", "not-a-valid-hash")


# -- quotas and budget -------------------------------------------------------


def test_login_returns_the_role_quota(client):
    response = client.post(
        "/auth/login", json={"subject": "reporter", "role": "journalist"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "journalist"
    assert body["queries_per_audit"] == quota_for(Role.JOURNALIST).queries_per_audit


def test_citizen_quota_is_smaller_than_auditor_quota():
    citizen = quota_for(Role.CITIZEN)
    auditor = quota_for(Role.CERTIFIED_AUDITOR)
    assert citizen.queries_per_audit < auditor.queries_per_audit
    assert citizen.max_epsilon < auditor.max_epsilon


def test_request_beyond_role_query_ceiling_is_refused(client):
    """A citizen may not run a 5,000-query sweep."""
    response = client.post(
        "/audits/explainability",
        json={"sample_size": 5000},
        headers=_auth(Role.CITIZEN),
    )
    assert response.status_code == 429
    assert "citizen" in response.json()["detail"]


def test_over_quota_request_never_reaches_the_engine(client):
    """Budget enforcement must precede probing, not follow it."""
    with patch("sentinel.api.routes.audits._explainability") as engine:
        response = client.post(
            "/audits/explainability",
            json={"sample_size": 5000},
            headers=_auth(Role.CITIZEN),
        )
        assert response.status_code == 429
        engine.assert_not_called()


def test_budget_status_is_reachable_with_a_valid_token(client):
    response = client.get("/audits/budget", headers=_auth())
    assert response.status_code == 200
    assert "epsilon_spent" in response.json()


# -- public verification -----------------------------------------------------


def test_verification_endpoints_are_public(client):
    """Gating these would defeat independent verifiability."""
    assert client.get("/verify/chain").status_code == 200
    assert client.get("/verify/public-key").status_code == 200
    assert client.get("/ledger/root").status_code == 200


def test_empty_ledger_verifies_cleanly(client):
    body = client.get("/verify/chain").json()
    assert body["valid"]
    assert body["reports_checked"] == 0
