"""SENTINEL command-line audit runner and demo driver.

Driven from the CLI rather than a browser for the live demo: fewer moving parts
on stage, and every command here has an equivalent API route if a judge wants to
inspect the HTTP surface instead.
"""

from __future__ import annotations

import json
import sqlite3
import time
from typing import Annotated

import numpy as np
import typer
from sqlalchemy import text
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from sentinel.config import get_settings
from sentinel.gateway.roles import Role, quota_for
from sentinel.ledger.models import create_session_factory
from sentinel.ledger.service import current_root, seal_report, verify_chain, verify_report

app = typer.Typer(
    name="sentinel",
    help="Run audit demonstrations against SENTINEL's synthetic welfare model.",
    no_args_is_help=True,
)
demo_app = typer.Typer(help="Live demo commands.")
app.add_typer(demo_app, name="demo")

console = Console()

_TARGET_ID = "welfare-eligibility-demo"


def _session():
    return create_session_factory()()


def _rule(title: str) -> None:
    console.print()
    console.rule(f"[bold cyan]{title}")


# -- beat 0: the target ------------------------------------------------------


@app.command("target")
def target_info() -> None:
    """Describe the system under audit -- disclosed, not hidden."""
    from sentinel.target.registry import load_demo_target

    _rule("Target system under audit")
    with console.status("Loading target model..."):
        target, dataset = load_demo_target()

    train_accuracy = (target.predict(dataset.x_train) == dataset.y_train).mean()
    test_accuracy = (target.predict(dataset.x_test) == dataset.y_test).mean()

    table = Table(show_header=False, box=None)
    table.add_row("Target", _TARGET_ID)
    table.add_row("Type", "Random forest eligibility classifier")
    table.add_row("Training records", f"{len(dataset.x_train):,}")
    table.add_row("Accuracy on training data", f"{train_accuracy:.1%}")
    table.add_row("Accuracy on unseen data", f"{test_accuracy:.1%}")
    table.add_row(
        "Generalization gap",
        f"{train_accuracy - test_accuracy:.1%}  [dim](memorization shows up here)",
    )
    console.print(table)

    console.print(
        Panel(
            "This is a locally-trained stand-in for a government system, on "
            "synthetic data. No real citizen data is used anywhere in this "
            "project.\n\nWhat is real is the audit methodology: the same code "
            "runs unmodified against any classifier that exposes predictions.",
            title="Disclosure",
            border_style="yellow",
        )
    )


# -- beat 1: identity --------------------------------------------------------


@app.command("login")
def login(
    subject: Annotated[str, typer.Option(help="Who is running this audit")] = "reporter",
    role: Annotated[Role, typer.Option(help="Auditor role")] = Role.JOURNALIST,
) -> None:
    """Issue an auditor token and show the quota it carries (M4)."""
    from sentinel.gateway.auth import issue_token

    _rule("M4 -- Auditor identity and access")
    token = issue_token(subject, role)
    quota = quota_for(role)

    table = Table(show_header=False, box=None)
    table.add_row("Auditor", subject)
    table.add_row("Role", str(role))
    table.add_row("Queries per audit", f"{quota.queries_per_audit:,}")
    table.add_row("Audits per day", str(quota.audits_per_day))
    table.add_row("Privacy budget (max eps)", f"{quota.max_epsilon}")
    table.add_row("Token", f"{token[:32]}...")
    console.print(table)
    console.print(
        "[dim]No anonymous, unlimited querying of a target system is possible.[/dim]"
    )


# -- beat 2: membership ------------------------------------------------------


@app.command("audit-membership")
def audit_membership(
    canary: Annotated[int, typer.Option(help="Which planted record to test")] = 7,
    seal: Annotated[bool, typer.Option(help="Seal the report to the ledger")] = True,
) -> None:
    """Test whether the system memorized a specific record (M1)."""
    from sentinel.engines.membership import MembershipAuditEngine
    from sentinel.reporting.plain import plain_language_membership
    from sentinel.target.registry import load_demo_target

    _rule("M1 -- Did this system memorize a specific person's record?")
    target, dataset = load_demo_target()

    with console.status("Calibrating against shadow models..."):
        engine = MembershipAuditEngine()
        engine.calibrate(target)

    index = dataset.canary_indices[canary % len(dataset.canary_indices)]
    heldout = 0

    planted = engine.audit(
        target,
        dataset.x_train[[index]],
        dataset.y_train[[index]],
        [f"planted-record-{canary}"],
        target_id=_TARGET_ID,
        with_decoys=True,
    )
    control = engine.audit(
        target,
        dataset.x_test[[heldout]],
        dataset.y_test[[heldout]],
        ["never-seen-record"],
        target_id=_TARGET_ID,
    )

    table = Table()
    table.add_column("Record")
    table.add_column("Memorization z", justify="right")
    table.add_column("p-value", justify="right")
    table.add_column("Verdict")

    for report, style in ((planted, "bold red"), (control, "green")):
        finding = report.findings[0]
        payload = finding.to_dict()
        table.add_row(
            payload["record_id"],
            f"{payload['memorization_z']:.2f}",
            f"{payload['p_value']:.1e}",
            f"[{style}]{payload['verdict']}[/{style}]",
        )
    console.print(table)

    finding = planted.findings[0]
    if finding.decoy_mean_score is not None:
        console.print(
            f"[dim]Decoy control: 20 near-neighbours of the planted record "
            f"scored {finding.decoy_mean_score:.3f} on average, versus "
            f"{finding.score.leakage_score:.3f} for the record itself -- the "
            f"system responds to this record specifically.[/dim]"
        )

    plain = plain_language_membership(finding)
    console.print(
        Panel(
            f"{plain['what_we_found']}\n\n{plain['what_it_means']}\n\n"
            f"[dim]{plain['how_sure_are_we']}[/dim]",
            title="In plain language",
            border_style="cyan",
        )
    )

    if seal:
        body = planted.to_dict()
        body["plain_language"] = plain
        with _session() as session:
            sealed = seal_report(
                session, body, audit_type="membership_inference", target_id=_TARGET_ID
            )
            from sentinel.privacy.guardian import BudgetGuardian

            BudgetGuardian(session).record_spend(_TARGET_ID, planted.queries_used)
        console.print(
            f"[green]Sealed to ledger at sequence {sealed.sequence} "
            f"(hash {sealed.report_hash[:16]}...)[/green]"
        )


# -- beat 3: explainability --------------------------------------------------


@app.command("audit-explainability")
def audit_explainability(
    sample: Annotated[int, typer.Option(help="Applications to test")] = 1500,
    seal: Annotated[bool, typer.Option(help="Seal the report to the ledger")] = True,
) -> None:
    """Test whether stated rejection reasons are the real ones (M2)."""
    from sentinel.data.welfare import generate_welfare_dataset
    from sentinel.engines.explainability import ExplainabilityAuditEngine
    from sentinel.reporting.plain import plain_language_explain
    from sentinel.target.registry import load_demo_target

    _rule("M2 -- Are the reasons this system gives the real ones?")
    target, dataset = load_demo_target()
    reference = generate_welfare_dataset(
        n_train=10, n_test=1500, n_canaries=0, seed=555001
    ).x_test

    with console.status("Resubmitting counterfactual applications..."):
        report = ExplainabilityAuditEngine().audit(
            target, dataset.x_test[:sample], reference, target_id=_TARGET_ID
        )

    table = Table()
    table.add_column("Reason given to the applicant")
    table.add_column("Cases", justify="right")
    table.add_column("Reason held up", justify="right")
    table.add_column("Wrong reason", justify="right")
    table.add_column("95% CI")

    for feature in report.features:
        rate = feature.mismatch.rate
        style = "red" if rate >= 0.15 else "yellow" if rate >= 0.05 else "green"
        table.add_row(
            feature.label,
            str(feature.n_cases),
            f"{feature.reliability:.1%}",
            f"[{style}]{rate:.1%}[/{style}]",
            f"[dim]{feature.mismatch.ci_low:.2f}-{feature.mismatch.ci_high:.2f}[/dim]",
        )
    console.print(table)

    plain = plain_language_explain(report)
    console.print(
        Panel(
            f"{plain['what_we_found']}\n\n{plain['what_it_means']}\n\n"
            f"[dim]{plain['how_sure_are_we']}[/dim]",
            title="In plain language",
            border_style="cyan",
        )
    )

    if seal:
        body = report.to_dict()
        body["plain_language"] = plain
        with _session() as session:
            sealed = seal_report(
                session,
                body,
                audit_type="explainability_consistency",
                target_id=_TARGET_ID,
            )
            from sentinel.privacy.guardian import BudgetGuardian

            BudgetGuardian(session).record_spend(_TARGET_ID, report.queries_used)
        console.print(
            f"[green]Sealed to ledger at sequence {sealed.sequence} "
            f"(hash {sealed.report_hash[:16]}...)[/green]"
        )


# -- red-team ----------------------------------------------------------------


@app.command("audit-fairness")
def audit_fairness(
    per_cohort: Annotated[int, typer.Option(help="Profiles per edge case")] = 500,
    seal: Annotated[bool, typer.Option(help="Seal the report to the ledger")] = True,
) -> None:
    """Stress-test the system against realistic edge-case citizens (Red-Team)."""
    from sentinel.data.welfare import generate_welfare_dataset
    from sentinel.engines.redteam import RedTeamEngine
    from sentinel.target.registry import load_demo_target

    _rule("Red-Team -- Who does this system fail?")
    target, _ = load_demo_target()
    baseline = generate_welfare_dataset(
        n_train=10, n_test=800, n_canaries=0, seed=771001
    ).x_test

    with console.status("Submitting synthetic citizen profiles..."):
        report = RedTeamEngine().audit(
            target, baseline, target_id=_TARGET_ID, per_cohort=per_cohort
        )

    table = Table()
    table.add_column("Group")
    table.add_column("Tested", justify="right")
    table.add_column("Rejected", justify="right")
    table.add_column("vs baseline", justify="right")
    table.add_column("Flagged")

    for cohort in report.cohorts:
        style = "red" if cohort.is_significant else "green"
        table.add_row(
            cohort.citizen_description,
            str(cohort.n),
            f"{cohort.rejection_rate.rate:.1%}",
            f"[{style}]{cohort.disparity:+.1%}[/{style}]",
            "YES" if cohort.is_significant else "-",
        )
    console.print(table)
    console.print(
        f"[dim]Baseline rejection rate: {report.baseline_rate:.1%} "
        f"over {report.baseline_n} matched clean applicants.[/dim]"
    )

    headline = report.headline()
    if headline:
        console.print(Panel(headline, title="Finding", border_style="red"))

    console.print(
        Panel(
            report.to_dict()["disclosure"],
            title="Disclosure",
            border_style="yellow",
        )
    )

    if seal:
        with _session() as session:
            sealed = seal_report(
                session,
                report.to_dict(),
                audit_type="fairness_red_team",
                target_id=_TARGET_ID,
            )
            from sentinel.privacy.guardian import BudgetGuardian

            BudgetGuardian(session).record_spend(_TARGET_ID, report.queries_used)
        console.print(
            f"[green]Sealed to ledger at sequence {sealed.sequence} "
            f"(hash {sealed.report_hash[:16]}...)[/green]"
        )


# -- beat 4: privacy budget --------------------------------------------------


@app.command("budget")
def budget(
    role: Annotated[Role, typer.Option()] = Role.JOURNALIST,
) -> None:
    """Show cumulative privacy loss, and what naive accounting would claim (M5)."""
    from sentinel.privacy.guardian import BudgetGuardian

    _rule("M5 -- Privacy budget for this audit campaign")
    with _session() as session:
        status = BudgetGuardian(session).status(_TARGET_ID, quota_for(role).max_epsilon)

    table = Table(show_header=False, box=None)
    table.add_row("Queries spent", f"{status['queries_spent']:,}")
    table.add_row(
        "Privacy spent (eps)",
        f"[bold green]{status['epsilon_spent']}[/bold green] of {status['max_epsilon']}",
    )
    table.add_row("Renyi order used (alpha*)", str(status["optimal_alpha"]))
    table.add_row(
        "If summed naively",
        f"[red]{status['naive_linear_epsilon']}[/red] "
        f"[dim]({status['composition_saving']} overstatement)[/dim]",
    )
    console.print(table)
    console.print(
        Panel(
            "Naive linear eps-summation would report the red figure and refuse "
            "audits that are in fact well within budget. Renyi DP composes in "
            "alpha-space and converts once at the end, which is both correct and "
            "materially tighter.",
            title="Why proper composition matters",
            border_style="yellow",
        )
    )


# -- beats 5-6: sealing and verification -------------------------------------


@app.command("verify")
def verify(
    sequence: Annotated[int | None, typer.Option(help="Verify one report")] = None,
) -> None:
    """Independently verify sealed reports (M3)."""
    _rule("M3 -- Independent verification")
    with _session() as session:
        if sequence is not None:
            valid, reason = verify_report(session, sequence)
            style = "green" if valid else "bold red"
            console.print(f"[{style}]{'VERIFIED' if valid else 'FAILED'}[/{style}] -- {reason}")
            return

        result = verify_chain(session)

    if result.valid:
        console.print(
            f"[bold green]CHAIN VERIFIED[/bold green] -- {result.checked} report(s) "
            f"intact, signatures valid."
        )
        if result.merkle_root:
            console.print(f"[dim]Published Merkle root: {result.merkle_root}[/dim]")
    else:
        console.print(
            f"[bold red]CHAIN BROKEN at sequence {result.broken_sequence}[/bold red]"
        )
        for failure in result.failures:
            console.print(f"  [red]*[/red] {failure}")

    console.print(
        "\n[dim]Verified against the Ed25519 public key committed to this "
        "repository -- no need to trust this server's response.[/dim]"
    )


@app.command("reports")
def reports() -> None:
    """List sealed reports."""
    from sqlalchemy import select

    from sentinel.ledger.models import AuditReportRow

    _rule("Sealed audit reports")
    with _session() as session:
        rows = list(
            session.execute(
                select(AuditReportRow).order_by(AuditReportRow.sequence.asc())
            ).scalars()
        )
        root = current_root(session)

    if not rows:
        console.print("[dim]No reports sealed yet.[/dim]")
        return

    table = Table()
    table.add_column("Seq", justify="right")
    table.add_column("Audit type")
    table.add_column("Sealed at")
    table.add_column("Hash")
    for row in rows:
        table.add_row(
            str(row.sequence),
            row.audit_type,
            row.created_at.strftime("%H:%M:%S"),
            f"[dim]{row.report_hash[:20]}...[/dim]",
        )
    console.print(table)
    console.print(f"[dim]Merkle root: {root}[/dim]")


@app.command("show")
def show(
    sequence: Annotated[int, typer.Argument(help="Report sequence number")],
    plain: Annotated[bool, typer.Option(help="Citizen-facing version only")] = False,
) -> None:
    """Print a sealed report."""
    from sqlalchemy import select

    from sentinel.ledger.models import AuditReportRow

    with _session() as session:
        row = session.execute(
            select(AuditReportRow).where(AuditReportRow.sequence == sequence)
        ).scalar_one_or_none()

    if row is None:
        console.print(f"[red]No report at sequence {sequence}.[/red]")
        raise typer.Exit(1)

    payload = json.loads(row.payload_json)
    if plain:
        language = payload["body"].get("plain_language")
        if not language:
            console.print("[dim]This report has no plain-language section.[/dim]")
            raise typer.Exit(1)
        _rule("Your audit result")
        for heading, key in (
            ("What we found", "what_we_found"),
            ("What it means", "what_it_means"),
            ("What you can do", "what_you_can_do"),
            ("How sure are we", "how_sure_are_we"),
        ):
            console.print(Panel(language[key], title=heading, border_style="cyan"))
    else:
        console.print_json(json.dumps(payload))


# -- beat 7: tamper ----------------------------------------------------------


@demo_app.command("tamper")
def demo_tamper(
    sequence: Annotated[int, typer.Option(help="Which report to alter")] = 0,
) -> None:
    """Alter a sealed report directly in the database, then re-verify.

    The demo's sharpest moment: edit the record in front of the audience with
    raw SQL -- bypassing every application guard -- and watch verification fail.
    """
    _rule("Tamper demonstration")
    settings = get_settings()
    database = settings.var_dir / "sentinel.db"

    if not database.exists():
        console.print("[red]No ledger yet. Run an audit first.[/red]")
        raise typer.Exit(1)

    connection = sqlite3.connect(database)
    row = connection.execute(
        "SELECT payload_json FROM audit_reports WHERE sequence = ?", (sequence,)
    ).fetchone()
    if row is None:
        console.print(f"[red]No report at sequence {sequence}.[/red]")
        connection.close()
        raise typer.Exit(1)

    payload = json.loads(row[0])
    console.print(f"Altering report {sequence} directly with SQL, as an attacker with")
    console.print("full database access would...\n")

    # Bury the finding -- the change an operator would actually want to make.
    payload.setdefault("body", {})["plain_language"] = {
        "what_we_found": "No problems were found with this system.",
        "what_it_means": "Everything is fine.",
        "what_you_can_do": "No action needed.",
        "how_sure_are_we": "Completely sure.",
    }
    connection.execute(
        "UPDATE audit_reports SET payload_json = ? WHERE sequence = ?",
        (json.dumps(payload, sort_keys=True, separators=(",", ":")), sequence),
    )
    connection.commit()
    connection.close()

    console.print('[yellow]Report now claims: "No problems were found."[/yellow]\n')

    with _session() as session:
        result = verify_chain(session)

    if result.valid:
        console.print("[bold red]Tampering went undetected -- this is a bug.[/bold red]")
        raise typer.Exit(1)

    console.print(
        f"[bold red]CHAIN BROKEN at sequence {result.broken_sequence}[/bold red]"
    )
    for failure in result.failures:
        console.print(f"  [red]*[/red] {failure}")
    console.print(
        "\n[green]The forgery is detectable by anyone, using only the public "
        "key -- the operator cannot quietly rewrite a finding.[/green]"
    )
    console.print(
        "\n[dim]Run 'sentinel demo reset' to restore a clean ledger.[/dim]"
    )


@demo_app.command("reset")
def demo_reset() -> None:
    """Delete the ledger and budget so the demo can be re-run."""
    settings = get_settings()
    database = settings.var_dir / "sentinel.db"

    if not database.exists():
        console.print("[green]Ledger already clear.[/green]")
        return

    try:
        database.unlink()
    except PermissionError:
        # Windows holds an exclusive lock while another process has the SQLite
        # file open -- typically a uvicorn instance left running. Falling back
        # to emptying the tables keeps the demo re-runnable instead of failing
        # with a stack trace in front of an audience.
        try:
            with _session() as session:
                session.execute(text("DELETE FROM audit_reports"))
                session.execute(text("DELETE FROM privacy_budget"))
                session.execute(text("DELETE FROM audit_quota"))
                session.commit()
            console.print(
                "[green]Ledger cleared.[/green] "
                "[dim](file is open elsewhere, so its tables were emptied "
                "instead of deleting it)[/dim]"
            )
            return
        except Exception:  # noqa: BLE001 - last resort, report and continue
            console.print(
                "[yellow]Could not reset the ledger: the database file is in "
                "use. Stop any running API server and try again.[/yellow]"
            )
            raise typer.Exit(1) from None

    console.print("[green]Ledger reset.[/green]")


# -- the full run ------------------------------------------------------------


@demo_app.command("run")
def demo_run() -> None:
    """Run the whole demo end to end."""
    start = time.perf_counter()

    demo_reset()
    target_info()
    # The full run includes a fairness sweep (~3,800 queries), which takes
    # cumulative eps past the journalist cap of 8.0. A systematic sweep is
    # certified-auditor work, so the demo runs as that role rather than
    # inflating a cap to fit -- the budget is meant to bind.
    login(role=Role.CERTIFIED_AUDITOR)
    audit_membership()
    audit_explainability()
    audit_fairness()
    budget(role=Role.CERTIFIED_AUDITOR)
    reports()
    verify()

    elapsed = time.perf_counter() - start
    console.print()
    console.print(
        Panel(
            f"Audited a system for memorized records, false rejection reasons, "
            f"and concentrated unfairness; sealed every finding to a "
            f"tamper-evident ledger; and verified them independently -- in "
            f"{elapsed:.0f} seconds, using only query access.\n\nNo model "
            f"internals. No training data. No cooperation from the system's "
            f"operator required.",
            title="Complete",
            border_style="green",
        )
    )


if __name__ == "__main__":
    app()
