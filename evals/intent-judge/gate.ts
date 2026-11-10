import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parse as parseToml } from "smol-toml";
import { z } from "zod";
import { EVALS_FOLDER } from "./workspace.ts";

type GateResult = { exitCode: number; output: string };

/** The share of a task's trials that must be right, by the difficulty its writer expects. */
const TARGETS = { easy: 0.95, medium: 0.75, hard: undefined } as const;

const RESULTS_FOLDER = `${EVALS_FOLDER}/results`;

// What Harbor writes for each trial: `<job>/<trial>/result.json`.
const trialResult = z.object({
  task_name: z.string(),
  config: z.object({ task: z.object({ path: z.string() }) }),
  verifier_result: z.object({ rewards: z.object({ reward: z.number() }) }).nullish(),
  exception_info: z.object({ exception_type: z.string() }).nullish(),
});

const taskToml = z.object({
  metadata: z.object({ difficulty: z.enum(["easy", "medium", "hard"]) }),
});

type Trial = z.infer<typeof trialResult>;

/** Checks each task in a Harbor job against its difficulty's target. A broken trial scores 0. */
export function gate(root: string, jobFolder: string): GateResult {
  const trials = trialFolders(jobFolder).map((folder) =>
    trialResult.parse(JSON.parse(readFileSync(join(folder, "result.json"), "utf8"))),
  );
  if (trials.length === 0) return { exitCode: 1, output: `no trials in ${jobFolder}\n` };

  const rows = [...Map.groupBy(trials, (trial) => trial.task_name)].map(([name, own]) =>
    taskRow(root, name, own),
  );
  const below = rows.filter((row) => row.below).length;
  const nameWidth = Math.max(...rows.map((row) => row.name.length));
  const lines = rows.map(
    (row) => `${row.name.padEnd(nameWidth)}  ${row.difficulty.padEnd(6)}  ${row.text}`,
  );
  const verdict = below === 0 ? "eval:gate passed" : `eval:gate failed · ${below} below target`;
  return { exitCode: below === 0 ? 0 : 1, output: `${[...lines, verdict].join("\n")}\n` };
}

function taskRow(root: string, name: string, trials: Trial[]) {
  const taskPath = resolve(root, trials[0]?.config.task.path ?? name);
  const { difficulty } = taskToml.parse(
    parseToml(readFileSync(join(taskPath, "task.toml"), "utf8")),
  ).metadata;
  const rewards = trials.map((trial) => trial.verifier_result?.rewards.reward ?? 0);
  const mean = rewards.reduce((sum, reward) => sum + reward, 0) / rewards.length;
  const broke = trials.filter((trial) => trial.exception_info).length;
  const score = `${mean.toFixed(2)} over ${trials.length} trials${broke > 0 ? ` (${broke} broke)` : ""}`;
  const target = TARGETS[difficulty];
  if (target === undefined) return { name, difficulty, below: false, text: `${score}, reported` };
  const below = mean < target;
  return {
    name,
    difficulty,
    below,
    text: `${score}, target ${target.toFixed(2)}${below ? ", below" : ""}`,
  };
}

function trialFolders(jobFolder: string): string[] {
  if (!existsSync(jobFolder)) return [];
  return readdirSync(jobFolder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(jobFolder, entry.name))
    .filter((folder) => existsSync(join(folder, "result.json")));
}

/** The job Harbor wrote last under the results folder. */
function latestJob(root: string): string | undefined {
  const results = join(root, RESULTS_FOLDER);
  if (!existsSync(results)) return undefined;
  return readdirSync(results)
    .map((name) => join(results, name))
    .filter((folder) => existsSync(join(folder, "result.json")))
    .toSorted((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

if (import.meta.main) {
  const root = process.cwd();
  const jobFolder = process.argv[2] ?? latestJob(root);
  if (jobFolder === undefined) {
    process.stdout.write(`no job under ${RESULTS_FOLDER}: run eval:judge first\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`${basename(jobFolder)}\n`);
    const { exitCode, output } = gate(root, jobFolder);
    process.stdout.write(output);
    process.exitCode = exitCode;
  }
}
