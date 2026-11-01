import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { RawReply, RunJudge } from "./intent-judge.ts";

/** What every copy holds beside its example. */
const SHARED = new Set([
  ".claude",
  "node_modules",
  "package.json",
  "tsconfig.json",
  "vitest.config.ts",
]);

const noProblems = (): RawReply => checklist([], []);

type FakeCall = { prompt: string; model: string | undefined; files: Record<string, string> };

/** The judge run through claude, recording what it was asked and the files of the copy it ran in. */
export function fakeClaudeClient() {
  const calls: FakeCall[] = [];
  let reply: (directory: string) => RawReply = noProblems;
  const run: RunJudge = async (directory, { prompt, model }) => {
    calls.push({ prompt, model, files: ownFiles(directory) });
    return reply(directory);
  };
  return {
    run,
    calls,
    replyWith(next: RawReply | ((directory: string) => RawReply)) {
      reply = typeof next === "function" ? next : () => next;
    },
  };
}

/** What claude streams with --output-format stream-json, one event a line. */
export function streamed(...events: unknown[]): RawReply {
  return {
    transcript: events.map((event) => `${JSON.stringify(event)}\n`).join(""),
    seconds: 1,
    error: undefined,
  };
}

/** The final event of a run that replied with `structuredOutput`. */
export function replied(structuredOutput: unknown) {
  return {
    type: "result",
    subtype: "success",
    is_error: false,
    structured_output: structuredOutput,
    total_cost_usd: 0.3,
  };
}

/** A run that replied with the judge's verdicts and did nothing else. */
export function checklist(requirements: unknown[], additionalChecks: unknown[]): RawReply {
  return streamed(replied({ requirements, additional_checks: additionalChecks }));
}

type Where = { scenario?: string; file?: string | null; line?: number | null };

/** A requirement the judge found unchecked, unless `verdict` says otherwise. */
export function unmetRequirement(
  requirement: string,
  {
    scenario = "B1",
    file = null,
    line = null,
    verdict = "misses_requirement",
  }: Where & { verdict?: string } = {},
) {
  return {
    scenario,
    requirement,
    test_file: file,
    test_line: line,
    reasoning: "no test checks it",
    verdict,
  };
}

/** A check the judge found beyond the scenario, adding a requirement unless `verdict` says otherwise. */
export function additionalCheck(
  check: string,
  {
    scenario = "B1",
    file = null,
    line = null,
    verdict = "adds_requirement",
  }: Where & { verdict?: string } = {},
) {
  return {
    scenario,
    check,
    test_file: file,
    test_line: line,
    reasoning: "the scenario doesn't say it",
    verdict,
  };
}

export function read(id: string, filePath: string) {
  return {
    type: "assistant",
    message: { content: [{ type: "tool_use", id, name: "Read", input: { file_path: filePath } }] },
  };
}

export function readResult(id: string, refused: boolean) {
  return {
    type: "user",
    message: { content: [{ type: "tool_result", tool_use_id: id, is_error: refused }] },
  };
}

function ownFiles(directory: string): Record<string, string> {
  const files = readdirSync(directory)
    .filter((name) => !SHARED.has(name))
    .flatMap((name) => filesUnder(join(directory, name)));
  return Object.fromEntries(
    files.map((path) => [relative(directory, path), readFileSync(path, "utf8")]),
  );
}

function filesUnder(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => filesUnder(join(path, name)));
}
