"""M3 validation (docs §7.2): tamper with the ledger, confirm detection."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest
from sqlalchemy import text

from sentinel.ledger.hashing import GENESIS_HASH, canonical_bytes
from sentinel.ledger.merkle import inclusion_proof, merkle_root, verify_inclusion
from sentinel.ledger.service import (
    current_root,
    seal_report,
    verify_chain,
    verify_report,
)


def _seal_several(session, count: int = 5) -> list:
    return [
        seal_report(
            session,
            {"finding": f"report-{i}", "leakage_score": 0.5 + i / 100},
            audit_type="membership",
            target_id="welfare-eligibility-demo",
        )
        for i in range(count)
    ]


def _db_path(session) -> Path:
    return Path(session.get_bind().url.database)


# -- canonical serialization -------------------------------------------------


def test_canonical_bytes_is_key_order_independent():
    a = {"b": 1, "a": {"y": 2, "x": 3}}
    b = {"a": {"x": 3, "y": 2}, "b": 1}
    assert canonical_bytes(a) == canonical_bytes(b)


def test_canonical_bytes_rejects_nan():
    """NaN is not valid JSON and round-trips inconsistently. Fail loudly."""
    with pytest.raises(ValueError):
        canonical_bytes({"rate": float("nan")})


# -- happy path --------------------------------------------------------------


def test_chain_verifies_when_untampered(ledger_session):
    _seal_several(ledger_session)
    result = verify_chain(ledger_session)
    assert result.valid
    assert result.checked == 5
    assert result.merkle_root is not None


def test_first_report_links_to_genesis(ledger_session):
    sealed = _seal_several(ledger_session, 1)
    assert sealed[0].previous_hash == GENESIS_HASH
    assert sealed[0].sequence == 0


def test_each_report_links_to_its_predecessor(ledger_session):
    sealed = _seal_several(ledger_session, 4)
    for previous, current in zip(sealed, sealed[1:]):
        assert current.previous_hash == previous.report_hash


def test_previous_hash_is_inside_the_signed_payload(ledger_session):
    """Trap #3, checked directly at the payload level.

    If previous_hash were attached after signing rather than being part of the
    signed bytes, it would not appear here.
    """
    sealed = _seal_several(ledger_session, 2)
    assert sealed[1].payload["previous_hash"] == sealed[0].report_hash
    assert sealed[1].payload["sequence"] == 1


# -- tamper detection --------------------------------------------------------


def test_mutating_a_middle_report_is_detected_at_that_row(ledger_session):
    """Docs §7.2: alter a historical report directly, confirm detection."""
    _seal_several(ledger_session, 5)
    ledger_session.close()

    # Raw SQL: simulate an attacker with direct database write access, bypassing
    # every application-level guard.
    path = _db_path(ledger_session)
    connection = sqlite3.connect(path)
    row = connection.execute(
        "SELECT payload_json FROM audit_reports WHERE sequence = 2"
    ).fetchone()
    payload = json.loads(row[0])
    payload["body"]["leakage_score"] = 0.01  # bury the finding
    connection.execute(
        "UPDATE audit_reports SET payload_json = ? WHERE sequence = 2",
        (json.dumps(payload, sort_keys=True, separators=(",", ":")),),
    )
    connection.commit()
    connection.close()

    from sentinel.ledger.models import create_session_factory

    session = create_session_factory(f"sqlite:///{path.as_posix()}")()
    result = verify_chain(session)

    assert not result.valid
    assert result.broken_sequence == 2
    assert "altered" in result.reason
    session.close()


def test_swapping_two_reports_invalidates_the_signature(ledger_session):
    """Trap #3's real payoff.

    Reordering must break the SIGNATURE, not merely the chain-link check. If
    sequence and previous_hash were outside the signed bytes, each signature
    would still verify after a swap and only the linkage check would notice —
    a weaker guarantee, since an attacker who can write rows could recompute
    linkage but cannot forge a signature.
    """
    _seal_several(ledger_session, 4)
    ledger_session.close()

    path = _db_path(ledger_session)
    connection = sqlite3.connect(path)
    connection.execute("UPDATE audit_reports SET sequence = 99 WHERE sequence = 1")
    connection.execute("UPDATE audit_reports SET sequence = 1 WHERE sequence = 2")
    connection.execute("UPDATE audit_reports SET sequence = 2 WHERE sequence = 99")
    connection.commit()
    connection.close()

    from sentinel.ledger.models import create_session_factory

    session = create_session_factory(f"sqlite:///{path.as_posix()}")()
    result = verify_chain(session)

    assert not result.valid
    # The payload carries its own sequence; moving a row makes the stored bytes
    # inconsistent with their position, which the signature commits to.
    assert result.broken_sequence == 1
    session.close()


def test_deleting_a_report_is_detected(ledger_session):
    _seal_several(ledger_session, 5)
    ledger_session.execute(text("DELETE FROM audit_reports WHERE sequence = 2"))
    ledger_session.commit()

    result = verify_chain(ledger_session)
    assert not result.valid
    assert result.broken_sequence == 3


def test_verify_report_isolates_a_single_record(ledger_session):
    _seal_several(ledger_session, 3)
    ok, reason = verify_report(ledger_session, 1)
    assert ok, reason

    missing_ok, missing_reason = verify_report(ledger_session, 42)
    assert not missing_ok
    assert "No report" in missing_reason


def test_exported_report_copy_verifies_and_one_character_edit_fails(ledger_session):
    from sentinel.api.routes.verify import ReportCopyRequest, verify_report_copy

    sealed = _seal_several(ledger_session, 1)[0]
    exported = ReportCopyRequest(
        payload=sealed.payload,
        report_hash=sealed.report_hash,
        signature=sealed.signature,
    )

    intact = verify_report_copy(exported)
    assert intact["valid"] is True

    altered_payload = json.loads(json.dumps(sealed.payload))
    altered_payload["body"]["finding"] = "changed by one character!"
    altered = verify_report_copy(
        ReportCopyRequest(
            payload=altered_payload,
            report_hash=sealed.report_hash,
            signature=sealed.signature,
        )
    )
    assert altered["valid"] is False
    assert "SHA-256 hash" in altered["reason"]


def test_report_copy_preserves_integral_float_bytes_across_javascript_round_trip(ledger_session):
    """Browser JSON.stringify changes 0.0 to 0; exact signed bytes must travel too."""
    from sentinel.api.routes.verify import ReportCopyRequest, verify_report_copy
    from sentinel.ledger.hashing import canonical_bytes

    original_payload = {"measurement": 0.0, "nested": {"rate": 1.0}}
    sealed = seal_report(
        ledger_session,
        original_payload,
        audit_type="synthetic_copy_test",
        target_id="synthetic-copy-test",
    )
    canonical_payload = canonical_bytes(sealed.payload).decode("utf-8")

    # JavaScript JSON.parse/JSON.stringify sends integral decimals as integers.
    def javascript_numbers(value):
        if isinstance(value, float) and value.is_integer():
            return int(value)
        if isinstance(value, dict):
            return {key: javascript_numbers(item) for key, item in value.items()}
        if isinstance(value, list):
            return [javascript_numbers(item) for item in value]
        return value

    browser_payload = javascript_numbers(sealed.payload)
    intact = verify_report_copy(ReportCopyRequest(
        payload=browser_payload,
        canonical_payload=canonical_payload,
        report_hash=sealed.report_hash,
        signature=sealed.signature,
    ))
    assert intact["valid"] is True

    altered_payload = {**browser_payload, "measurement": 2}
    altered = verify_report_copy(ReportCopyRequest(
        payload=altered_payload,
        canonical_payload=canonical_payload,
        report_hash=sealed.report_hash,
        signature=sealed.signature,
    ))
    assert altered["valid"] is False
    assert "does not match" in altered["reason"]


def test_report_copy_verifier_rejects_extra_fields():
    from pydantic import ValidationError

    from sentinel.api.routes.verify import ReportCopyRequest

    with pytest.raises(ValidationError):
        ReportCopyRequest(
            payload={"body": {}},
            report_hash="0" * 64,
            signature="0" * 128,
            private_key="must not be accepted",
        )


# -- Merkle ------------------------------------------------------------------


def test_merkle_inclusion_proof_verifies():
    leaves = [f"{i:064x}" for i in range(7)]  # odd count exercises duplication
    root = merkle_root(leaves)
    for index in range(len(leaves)):
        proof = inclusion_proof(leaves, index)
        assert verify_inclusion(leaves[index], proof, root)


def test_merkle_proof_fails_for_a_tampered_leaf():
    leaves = [f"{i:064x}" for i in range(4)]
    root = merkle_root(leaves)
    proof = inclusion_proof(leaves, 2)
    assert not verify_inclusion(f"{99:064x}", proof, root)


def test_published_root_changes_when_a_report_is_added(ledger_session):
    _seal_several(ledger_session, 3)
    before = current_root(ledger_session)
    _seal_several(ledger_session, 1)
    assert current_root(ledger_session) != before
