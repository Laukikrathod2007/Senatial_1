"""Shared fixtures.

Expensive artifacts are session-scoped and disk-cached: the target model takes
~15s to fit and the shadow ensemble takes minutes, so per-test training would
make the suite unusable.
"""

from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from sentinel.data.welfare import WelfareDataset
from sentinel.ledger.models import create_session_factory
from sentinel.target.system import TargetSystem


@pytest.fixture(scope="session")
def demo_target() -> tuple[TargetSystem, WelfareDataset]:
    """The stand-in system under audit, plus its dataset for ground truth.

    The dataset is available to tests only. Engines never receive it — that is
    the black-box constraint the whole project rests on.
    """
    from sentinel.target.registry import load_demo_target

    return load_demo_target()


@pytest.fixture
def ledger_session(tmp_path) -> Session:
    """A fresh file-backed SQLite ledger per test.

    File-backed rather than in-memory because tamper tests reconnect with raw
    SQL to simulate an attacker with database access.
    """
    url = f"sqlite:///{(tmp_path / 'ledger.db').as_posix()}"
    factory = create_session_factory(url)
    session = factory()
    try:
        yield session
    finally:
        session.close()
