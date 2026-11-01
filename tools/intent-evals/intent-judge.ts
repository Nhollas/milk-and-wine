import { readFileSync } from "node:fs";
import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { blockReasonOf } from "../../.claude/agents/intent-judge/guard.ts";
import type { Problem, RunOutcome } from "./runs.ts";

export const JUDGE_FILE = ".claude/agents/intent-judge/intent-judge.md";

const BUDGET_USD = 2;

const TIMEOUT_MS = 15 * 60 * 1000;

// An agent on the main thread doesn't run the hooks in its own frontmatter, so the guard is passed here.
const GUARD_SETTINGS = {
  hooks: {
    PreToolUse: [
      {
        matcher: ".*",
        hooks: [
          {
            type: "command" as const,
            command: 'node "$CLAUDE_PROJECT_DIR/.claude/agents/intent-judge/guard.ts"',
          },
        ],
      },
    ],
  },
};

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

/** What claude gave back for one run of the judge, before anything reads it. */
export type RawReply = {
  /** Everything claude sent, in order. */
  messages: SDKMessage[];
  seconds: number;
  /** Why claude stopped, which matters only if it stopped without a result. */
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

/** The real judge: the Agent SDK running the intent-judge agent, behind its guard. */
export const runClaudeJudge: RunJudge = async (directory, { prompt, model }) => {
  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, TIMEOUT_MS);
  const started = performance.now();
  const messages: SDKMessage[] = [];
  let error: string | undefined;
  try {
    const stream = query({
      prompt,
      options: {
        cwd: directory,
        agent: "intent-judge",
        systemPrompt: { type: "preset", preset: "claude_code" },
        settings: GUARD_SETTINGS,
        settingSources: ["project"],
        persistSession: false,
        maxBudgetUsd: BUDGET_USD,
        outputFormat: {
          type: "json_schema",
          schema: z.toJSONSchema(reply, { target: "draft-07" }),
        },
        abortController,
        ...(model === undefined ? {} : { model }),
      },
    });
    for await (const message of stream) messages.push(message);
  } catch (thrown) {
    error = `claude stopped: ${String(thrown)}`;
  } finally {
    clearTimeout(timeout);
  }
  return { messages, seconds: (performance.now() - started) / 1000, error };
};

/** Reads a raw reply from a run in `directory`: a forbidden read first, then a broken run, then its problems. */
export function readReply(raw: RawReply, directory: string): Reply {
  const final = raw.messages.find((message) => message.type === "result");
  const costUsd = final?.total_cost_usd ?? 0;
  const broken = (failure: string): Reply => ({
    costUsd,
    problems: undefined,
    outcome: "broken",
    failure,
  });

  const breach = guardBreach(raw.messages, directory);
  if (breach !== undefined) {
    return { costUsd, problems: undefined, outcome: "forbidden read", failure: breach };
  }
  if (final === undefined) return broken(raw.error ?? "claude ended without a result");
  if (final.subtype === "error_max_budget_usd") {
    return broken(`the call reached its $${BUDGET_USD} spending limit`);
  }
  if (final.subtype !== "success") return broken(final.errors.join("\n"));
  if (final.is_error) return broken(final.result);
  const parsed = reply.safeParse(final.structured_output);
  if (!parsed.success) {
    return broken(`the reply doesn't match the reply schema:\n${z.prettifyError(parsed.error)}`);
  }
  return { costUsd, problems: problemsIn(parsed.data) };
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
function guardBreach(messages: SDKMessage[], directory: string): string | undefined {
  const calls = messages
    .flatMap((message) => (message.type === "assistant" ? message.message.content : []))
    .filter((block) => block.type === "tool_use");
  const refused = new Set(
    messages
      .flatMap((message) =>
        message.type === "user" && typeof message.message.content !== "string"
          ? message.message.content
          : [],
      )
      .flatMap((block) =>
        block.type === "tool_result" && block.is_error === true ? [block.tool_use_id] : [],
      ),
  );
  for (const block of calls) {
    if (refused.has(block.id)) continue;
    const hookInput = JSON.stringify({
      tool_name: block.name,
      tool_input: block.input,
      cwd: directory,
    });
    if (blockReasonOf(hookInput, directory) !== undefined) {
      return `the guard let a forbidden ${block.name} through: ${JSON.stringify(block.input)}`;
    }
  }
  return undefined;
}
