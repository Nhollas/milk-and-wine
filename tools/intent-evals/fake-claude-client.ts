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

/** A run that replied with the judge's checklist and did nothing else. */
export function checklist(parts: unknown[], extras: unknown[]): RawReply {
  return streamed(replied({ parts, extras }));
}

export function unalignedPart(
  part: string,
  { scenario = "B1", checkedBy = null }: { scenario?: string; checkedBy?: string | null } = {},
) {
  return { scenario, part, "checked by": checkedBy, aligned: false, why: "no test checks it" };
}

/** Something the judge noted that a scenario doesn't say, marked extra unless `extra` says otherwise. */
export function extraCheck(
  checks: string,
  where: string,
  { scenario = "B1", extra = true }: { scenario?: string; extra?: boolean } = {},
) {
  return { scenario, checks, where, extra, why: "the scenario doesn't say it" };
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
