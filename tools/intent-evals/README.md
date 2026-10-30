# Intent evals

Measures the [intent judge](../../.claude/agents/intent-judge/intent-judge.md). What it does, and the words for its parts, are in [its spec](../../specs/tools/intent-evals/spec.md).

- `examples/<example>/` is a small made-up subject laid out like this repository: `specs/`, `src/` and, if it needs them, `tests/`. Its tests run only through these tools.
- `cases/<example>/<id>.json` plants one gap in an example's tests. `pnpm eval:check` proves each case is a gap without running the judge.
- `pnpm eval:judge` runs the judge on each case and reports what it found. It is being rebuilt to the spec; `eval:check` is delivered.
