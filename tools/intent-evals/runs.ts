import type { EvalCase } from "./cases.ts";

/** One problem the judge reports: its verdict, the words it is about, and the test line it points at. */
export type Problem = {
  scenario: string;
  verdict: string;
  says: string;
  file: string | null;
  line: number | null;
};

/** A planted case's run finds its gap or not; a tests_are_right case's run is clean or a false positive. */
export type RunOutcome =
  | "found"
  | "not found"
  | "clean"
  | "false positive"
  | "broken"
  | "forbidden read";

/** One run of the judge on one case, scored against the case. */
export type ScoredRun = {
  evalCase: EvalCase;
  model: string;
  outcome: RunOutcome;
  /** Every problem the run reported. */
  problems: Problem[];
  costUsd: number;
  seconds: number;
  /** Why the run is broken, or what the judge read that the guard forbids. */
  failure: string | undefined;
  /** Everything claude streamed, one JSON object a line, saved beside the report. */
  transcript: string;
};

/** A run the judge got right: it found the gap, or reported nothing on tests that are right. */
export function isRight(run: ScoredRun): boolean {
  return run.outcome === "found" || run.outcome === "clean";
}
