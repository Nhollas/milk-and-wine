import { copyFileSync, existsSync, readFileSync } from "node:fs";
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

const verdictPart = z.object({
  part: z.string(),
  breaks: z.array(z.object({ break: z.string(), "caught by": z.string().nullable() })),
  verdict: z.enum(["checked", "weak", "missing", "elsewhere"]),
  where: z.string().nullable(),
  why: z.string(),
});

const verdicts = z.record(
  z.string(),
  // oxlint-disable-next-line unicorn/no-thenable -- the key names the spec's Then column
  z.object({ given: z.array(verdictPart), then: z.array(verdictPart) }),
);

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
  total_cost_usd: z.number().optional(),
  duration_ms: z.number().optional(),
});

type Verdicts = z.infer<typeof verdicts>;

export type VerdictPart = z.infer<typeof verdictPart>;

export type Judgement = {
  verdicts: Verdicts | undefined;
  /** Why the judgement can't be scored at all. */
  failure: string | undefined;
  /** What is odd about verdicts that can still be scored. */
  warnings: string[];
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
  const { result = "", is_error, total_cost_usd = 0 } = final.data;
  const costUsd = total_cost_usd;
  const base = { costUsd, seconds, reply: result };
  if (is_error === true) return { ...base, verdicts: undefined, failure: result, warnings: [] };

  const breach = guardBreach(events, directory);
  if (breach) return { ...base, verdicts: undefined, failure: breach, warnings: [] };

  const parsed = verdictsIn(result);
  if (typeof parsed === "string")
    return { ...base, verdicts: undefined, failure: parsed, warnings: [] };
  const missing = options.rows.filter((row) => !(row in parsed));
  if (missing.length > 0) {
    return {
      ...base,
      verdicts: undefined,
      failure: `no verdict for ${missing.join(", ")}`,
      warnings: [],
    };
  }
  return {
    ...base,
    verdicts: parsed,
    failure: undefined,
    warnings: warningsAbout(parsed, directory),
  };
}

function failed(failure: string, seconds: number): Judgement {
  return { verdicts: undefined, failure, warnings: [], costUsd: 0, seconds, reply: "" };
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

/** A judge that read what the guard forbids has seen the code, so its verdicts mean nothing. */
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

function verdictsIn(reply: string): Verdicts | string {
  const json = /\{[\s\S]*\}/u.exec(reply)?.[0];
  if (json === undefined) return "the reply holds no JSON";
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return "the reply's JSON doesn't parse";
  }
  const parsed = verdicts.safeParse(value);
  return parsed.success
    ? parsed.data
    : `the verdicts don't match the format: ${z.prettifyError(parsed.error)}`;
}

function warningsAbout(all: Verdicts, directory: string): string[] {
  const warnings: string[] = [];
  for (const [row, { given, then }] of Object.entries(all)) {
    for (const part of [...given, ...then]) {
      const name = `${row} "${part.part.slice(0, 40)}"`;
      const unproven = part.breaks.some((entry) => entry["caught by"] === null);
      if (part.verdict === "checked" && unproven)
        warnings.push(`${name} is checked with a break nothing catches`);
      if (part.verdict === "missing" && part.where !== null)
        warnings.push(`${name} is missing but points at ${part.where}`);
      if ((part.verdict === "checked" || part.verdict === "weak") && part.where === null) {
        warnings.push(`${name} is ${part.verdict} but points nowhere`);
      }
      const references = [part.where, ...part.breaks.map((entry) => entry["caught by"])];
      for (const reference of references) {
        if (reference !== null && !pointsAtALine(reference, directory)) {
          warnings.push(`${name} points at ${reference}, which isn't a line of a file`);
        }
      }
    }
  }
  return warnings;
}

function pointsAtALine(reference: string, directory: string): boolean {
  const match = /^(.+?):(\d+)/u.exec(reference);
  const [, file, line] = match ?? [];
  if (file === undefined || line === undefined) return false;
  const path = join(directory, file);
  return existsSync(path) && Number(line) <= readFileSync(path, "utf8").split("\n").length;
}
