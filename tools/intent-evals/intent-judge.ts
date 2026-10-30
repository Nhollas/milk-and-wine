import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { blockReasonOf } from "../../.claude/agents/intent-judge/guard.ts";
import { runProcess } from "./subprocess.ts";

export const JUDGE_FILE = ".claude/agents/intent-judge/intent-judge.md";

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

const part = z.object({
  scenario: z.string(),
  part: z.string(),
  "checked by": z.string().nullable(),
  aligned: z.boolean(),
  why: z.string(),
});

const extra = z.object({
  scenario: z.string(),
  checks: z.string(),
  where: z.string(),
});

// The judge accounts for every part of a scenario, so a part it skipped can't pass for one it approved.
const reply = z.object({ parts: z.array(part), extras: z.array(extra) });

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
  result: z.string().optional(),
  is_error: z.boolean().optional(),
  structured_output: z.unknown().optional(),
  total_cost_usd: z.number().optional(),
  duration_ms: z.number().optional(),
});

type Checklist = z.infer<typeof reply>;

export type Misalignment = {
  scenario: string;
  says: string;
  "checked instead": string;
  where: string | null;
};

export type Judgement = {
  /** Undefined when the judgement can't be scored. An empty list means every judged scenario is aligned. */
  misalignments: Misalignment[] | undefined;
  checklist: Checklist | undefined;
  /** Why the judgement can't be scored at all. */
  failure: string | undefined;
  costUsd: number;
  seconds: number;
  /** Every event claude streamed, one JSON object a line, to see what the judge read. */
  transcript: string;
};

export type JudgeOptions = {
  subject: string;
  /** The scenarios to judge. */
  scenarios: string[];
  /** A model to run the judge on, in place of the one its definition names. */
  model: string | undefined;
};

/** The model a definition of the judge names. */
export function modelOf(definition: string): string {
  return /^model: (.+)$/mu.exec(readFileSync(definition, "utf8"))?.[1]?.trim() ?? "default";
}

/** Runs the intent judge in `directory`, a workspace holding one example. */
export async function judge(directory: string, options: JudgeOptions): Promise<Judgement> {
  const judgeFile = join(directory, JUDGE_FILE);
  if (options.model !== undefined) {
    const definition = readFileSync(judgeFile, "utf8");
    writeFileSync(judgeFile, definition.replace(/^model: .+$/mu, `model: ${options.model}`));
  }
  const prompt = `Judge the tests of the ${options.subject} spec. Judge only ${options.scenarios.join(", ")}.`;
  const started = performance.now();
  const output = await runClaude(directory, prompt);
  const seconds = (performance.now() - started) / 1000;
  if (typeof output !== "string") return failed(output.error, seconds);

  const events = output
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
    .find((parsed) => parsed.success);
  const base = { costUsd: final?.data.total_cost_usd ?? 0, seconds, transcript: output };
  const unscored = { misalignments: undefined, checklist: undefined };
  if (!final) return { ...base, ...unscored, failure: "claude ended without a result" };
  if (final.data.is_error === true) {
    return { ...base, ...unscored, failure: final.data.result ?? "claude failed" };
  }

  const breach = guardBreach(events, directory);
  if (breach) return { ...base, ...unscored, failure: breach };

  const parsed = reply.safeParse(final.data.structured_output);
  if (!parsed.success) {
    return { ...base, ...unscored, failure: "the reply has no structured output" };
  }
  return {
    ...base,
    misalignments: misalignmentsIn(parsed.data),
    checklist: parsed.data,
    failure: undefined,
  };
}

function misalignmentsIn({ parts, extras }: Checklist): Misalignment[] {
  return [
    ...parts
      .filter((each) => !each.aligned)
      .map((each) => ({
        scenario: each.scenario,
        says: each.part,
        "checked instead": each.why,
        where: each["checked by"],
      })),
    ...extras.map((each) => ({
      scenario: each.scenario,
      says: "nothing about this",
      "checked instead": each.checks,
      where: each.where,
    })),
  ];
}

function failed(failure: string, seconds: number): Judgement {
  return {
    misalignments: undefined,
    checklist: undefined,
    failure,
    costUsd: 0,
    seconds,
    transcript: "",
  };
}

async function runClaude(directory: string, prompt: string): Promise<string | { error: string }> {
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
    "2",
    "--json-schema",
    JSON.stringify(z.toJSONSchema(reply, { target: "draft-07" })),
    "--output-format",
    "stream-json",
    "--verbose",
    prompt,
  ];
  try {
    const { stdout } = await runProcess("claude", args, {
      cwd: directory,
      timeoutMs: 15 * 60 * 1000,
    });
    return stdout;
  } catch (error) {
    return { error: `claude didn't run: ${String(error)}` };
  }
}

/** A judge that read what the guard forbids has seen the code, so its findings mean nothing. */
function guardBreach(events: unknown[], directory: string): string | undefined {
  const results = new Map<string, boolean>();
  for (const event of events) {
    const parsed = message.safeParse(event);
    if (!parsed.success || !Array.isArray(parsed.data.message.content)) continue;
    for (const block of parsed.data.message.content as unknown[]) {
      const result = toolResult.safeParse(block);
      if (result.success) results.set(result.data.tool_use_id, result.data.is_error === true);
    }
  }
  for (const event of events) {
    const parsed = message.safeParse(event);
    if (!parsed.success || !Array.isArray(parsed.data.message.content)) continue;
    for (const block of parsed.data.message.content as unknown[]) {
      const call = toolUse.safeParse(block);
      if (!call.success) continue;
      const hookInput = JSON.stringify({
        tool_name: call.data.name,
        tool_input: call.data.input,
        cwd: directory,
      });
      const forbidden = blockReasonOf(hookInput, directory);
      if (forbidden !== undefined && results.get(call.data.id) !== true) {
        return `the guard let a forbidden ${call.data.name} through: ${JSON.stringify(call.data.input)}`;
      }
    }
  }
  return undefined;
}
