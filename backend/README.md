# SENTINEL — backend

Audit engines, cryptographic ledger, access gateway, and API for SENTINEL.

See the repository root `README.md` for project context, and
`SENTINEL_Project_Documentation.md` for the full technical specification.

## Development

```bash
uv sync
uv run pytest -m "not slow"    # fast loop
uv run pytest                  # full suite, includes shadow-model training
uv run sentinel --help
```
