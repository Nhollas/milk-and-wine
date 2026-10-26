import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { blockReasonOf } from "../../.claude/agents/intent-judge/guard.ts";
import { runProcess } from "./subprocess.ts";

const JUDGE_FILE = ".claude/agents/intent-judge/intent-judge.md";

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

const misalignment = z.object({
  row: z.string(),
  says: z.string(),
  "checked instead": z.string(),
  where: z.string().nullable(),
});

// The judge must reply in this shape, so its findings never have to be dug out of free text.
const reply = z.object({ misalignments: z.array(misalignment) });

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

export type Misalignment = z.infer<typeof misalignment>;

export type Judgement = {
  /** Undefined when the judgement can't be scored. An empty list means every judged row is aligned. */
  misalignments: Misalignment[] | undefined;
  /** Why the judgement can't be scored at all. */
  failure: string | undefined;
  costUsd: number;
  seconds: number;
  reply: string;
};

export type JudgeOptions = {
  subject: string;
  /** The rows to judge. */
  rows: string[];
  /** A different definition of the judge to try, in place of the one in the repository. */
  definition: string | undefined;
};

/** Runs the intent judge in `directory`, a copy of the repository. */
export async function judge(directory: string, options: JudgeOptions): Promise<Judgement> {
  if (options.definition !== undefined) {
    copyFileSync(options.definition, join(directory, JUDGE_FILE));
  }
  const prompt = `Judge the tests of the ${options.subject} spec. Judge only ${options.rows.join(", ")}.`;
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
  if (!final) return failed("claude ended without a result", seconds);
  const { result = "", is_error, structured_output, total_cost_usd = 0 } = final.data;
  const costUsd = total_cost_usd;
  const base = { costUsd, seconds, reply: result };
  if (is_error === true) return { ...base, misalignments: undefined, failure: result };

  const breach = guardBreach(events, directory);
  if (breach) return { ...base, misalignments: undefined, failure: breach };

  const parsed = reply.safeParse(structured_output);
  return parsed.success
    ? { ...base, misalignments: parsed.data.misalignments, failure: undefined }
    : { ...base, misalignments: undefined, failure: "the reply has no structured output" };
}

function failed(failure: string, seconds: number): Judgement {
  return { misalignments: undefined, failure, costUsd: 0, seconds, reply: "" };
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
