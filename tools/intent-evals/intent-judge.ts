import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { blockReasonOf } from "../../.claude/agents/intent-judge/guard.ts";
import type { Problem, RunOutcome } from "./runs.ts";
import { runProcess } from "./subprocess.ts";

export const JUDGE_FILE = ".claude/agents/intent-judge/intent-judge.md";

const BUDGET_USD = 2;

// `--agent` doesn't run the hooks in the agent's own frontmatter, so the guard is passed here.
const GUARD_SETTINGS = JSON.stringify({
  hooks: {
    PreToolUse: [
      {
        matcher: ".*",
        hooks: [
          {
            type: "command",
            command: 'node "$CLAUDE_PROJECT_DIR/.claude/agents/intent-judge/guard.ts"',
          },
        ],
      },
    ],
  },
});

const location = { test_file: z.string().nullable(), test_line: z.number().nullable() };

const requirement = z.object({
  scenario: z.string(),
  requirement: z.string(),
  ...location,
  reasoning: z.string(),
  verdict: z.enum([
    "aligned",
    "misses_requirement",
    "checks_something_else",
    "setup_hides_requirement",
    "contradicts_requirement",
  ]),
});

const additionalCheck = z.object({
  scenario: z.string(),
  check: z.string(),
  ...location,
  reasoning: z.string(),
  verdict: z.enum(["adds_requirement", "setup_only", "boundary_of_requirement"]),
});

// The judge accounts for every requirement, so one it skipped can't pass for one it approved.
const reply = z.object({
  requirements: z.array(requirement),
  additional_checks: z.array(additionalCheck),
});

const toolUse = z.object({
  type: z.literal("tool_use"),
  id: z.string(),
  name: z.string(),
  input: z.record(z.string(), z.unknown()),
});

const toolResult = z.object({
  type: z.literal("tool_result"),
  tool_use_id: z.string(),
  is_error: z.boolean().optional(),
});

const message = z.object({
  type: z.enum(["assistant", "user"]),
  message: z.object({ content: z.unknown() }),
});

const finalResult = z.object({
  type: z.literal("result"),
  subtype: z.string().optional(),
  result: z.string().optional(),
  is_error: z.boolean().optional(),
  structured_output: z.unknown().optional(),
  total_cost_usd: z.number().optional(),
});

/** What the CLI gave back for one run of the judge, before anything reads it. */
export type RawReply = {
  /** Everything claude streamed, one JSON object a line. */
  transcript: string;
  seconds: number;
  /** Why claude didn't run at all. */
  error: string | undefined;
};

/** Runs the intent judge once in `directory`, a workspace holding one example. */
export type RunJudge = (
  directory: string,
  options: {
    prompt: string;
    /** A model to run the judge on, in place of the one its definition names. */
    model: string | undefined;
  },
) => Promise<RawReply>;

/** A raw reply read: the problems it reported, or why it can't be scored. */
export type Reply = { costUsd: number } & (
  | { problems: Problem[] }
  | {
      problems: undefined;
      outcome: Extract<RunOutcome, "broken" | "forbidden read">;
      failure: string;
    }
);

/** The model a definition of the judge names. */
export function modelOf(definition: string): string {
  return /^model: (.+)$/mu.exec(readFileSync(definition, "utf8"))?.[1]?.trim() ?? "default";
}

/** The judge's prompt: every scenario of the subject, or only the ones named. */
export function promptFor(subject: string, scenarios: string[]): string {
  const only = scenarios.length === 0 ? "" : ` Judge only ${scenarios.join(", ")}.`;
  return `Judge the tests of the ${subject} spec.${only}`;
}

/** The real judge: the Claude Code CLI running the intent-judge agent, behind its guard. */
export const runClaudeJudge: RunJudge = async (directory, { prompt, model }) => {
  if (model !== undefined) {
    const judgeFile = join(directory, JUDGE_FILE);
    const definition = readFileSync(judgeFile, "utf8");
    writeFileSync(judgeFile, definition.replace(/^model: .+$/mu, `model: ${model}`));
  }
  const args = [
    "-p",
    "--agent",
    "intent-judge",
    "--settings",
    GUARD_SETTINGS,
    "--setting-sources",
    "project",
    "--no-session-persistence",
    "--max-budget-usd",
    String(BUDGET_USD),
    "--json-schema",
    JSON.stringify(z.toJSONSchema(reply, { target: "draft-07" })),
    "--output-format",
    "stream-json",
    "--verbose",
    prompt,
  ];
  const started = performance.now();
  try {
    const { stdout } = await runProcess("claude", args, {
      cwd: directory,
      timeoutMs: 15 * 60 * 1000,
    });
    return { transcript: stdout, seconds: (performance.now() - started) / 1000, error: undefined };
  } catch (error) {
    return {
      transcript: "",
      seconds: (performance.now() - started) / 1000,
      error: `claude didn't run: ${String(error)}`,
    };
  }
};

/** Reads a raw reply from a run in `directory`: a forbidden read first, then a broken run, then its problems. */
export function readReply(raw: RawReply, directory: string): Reply {
  if (raw.error !== undefined) {
    return { costUsd: 0, problems: undefined, outcome: "broken", failure: raw.error };
  }
  const events = raw.transcript
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as unknown];
      } catch {
        return [];
      }
    });
  const final = events
    .map((event) => finalResult.safeParse(event))
    .find((parsed) => parsed.success)?.data;
  const costUsd = final?.total_cost_usd ?? 0;
  const broken = (failure: string): Reply => ({
    costUsd,
    problems: undefined,
    outcome: "broken",
    failure,
  });

  const breach = guardBreach(events, directory);
  if (breach !== undefined) {
    return { costUsd, problems: undefined, outcome: "forbidden read", failure: breach };
  }
  if (final === undefined) return broken("claude ended without a result");
  if (reachedBudget(final)) return broken(`the call reached its $${BUDGET_USD} spending limit`);
  if (final.is_error === true || (final.subtype !== undefined && final.subtype !== "success")) {
    return broken(final.result ?? final.subtype ?? "claude failed");
  }
  const parsed = reply.safeParse(final.structured_output);
  if (!parsed.success) {
    return broken(`the reply doesn't match the reply schema:\n${z.prettifyError(parsed.error)}`);
  }
  return { costUsd, problems: problemsIn(parsed.data) };
}

// Claude Code ends a run stopped by --max-budget-usd with a result whose subtype is
// `error_max_budget_usd`; older versions said so only in the result text. Either counts.
function reachedBudget(final: z.infer<typeof finalResult>): boolean {
  return /budget/iu.test(final.subtype ?? "") || /budget/iu.test(final.result ?? "");
}

/** A requirement not aligned is a problem on its words; a check that adds a requirement is one on what it checks. */
function problemsIn({ requirements, additional_checks }: z.infer<typeof reply>): Problem[] {
  return [
    ...requirements
      .filter((each) => each.verdict !== "aligned")
      .map((each) => problem(each, each.requirement)),
    ...additional_checks
      .filter((each) => each.verdict === "adds_requirement")
      .map((each) => problem(each, each.check)),
  ];
}

function problem(
  each: { scenario: string; verdict: string; test_file: string | null; test_line: number | null },
  says: string,
): Problem {
  return {
    scenario: each.scenario,
    verdict: each.verdict,
    says,
    file: each.test_file,
    line: each.test_line,
  };
}

/** A judge that read what the guard forbids has seen the code, so its findings mean nothing. */
function guardBreach(events: unknown[], directory: string): string | undefined {
  const blocks = events.flatMap((event) => {
    const parsed = message.safeParse(event);
    return parsed.success && Array.isArray(parsed.data.message.content)
      ? (parsed.data.message.content as unknown[])
      : [];
  });
  const refused = new Set(
    blocks.flatMap((block) => {
      const result = toolResult.safeParse(block);
      return result.success && result.data.is_error === true ? [result.data.tool_use_id] : [];
    }),
  );
  for (const block of blocks) {
    const call = toolUse.safeParse(block);
    if (!call.success || refused.has(call.data.id)) continue;
    const hookInput = JSON.stringify({
      tool_name: call.data.name,
      tool_input: call.data.input,
      cwd: directory,
    });
    if (blockReasonOf(hookInput, directory) !== undefined) {
      return `the guard let a forbidden ${call.data.name} through: ${JSON.stringify(call.data.input)}`;
    }
  }
  return undefined;
}
