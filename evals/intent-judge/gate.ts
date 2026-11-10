import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { z } from "zod";
import { EVALS_FOLDER } from "./workspace.ts";

type GateResult = { exitCode: number; output: string };

/** The share of each task's trials that must be right: 5 of 6. */
const TARGET = 0.8;

const RESULTS_FOLDER = `${EVALS_FOLDER}/results`;

// What Harbor writes for each trial: `<job>/<trial>/result.json`.
const trialResult = z.object({
  task_name: z.string(),
  verifier_result: z
    .object({
      rewards: z.object({
        reward: z.number(),
        noticed: z.number().optional(),
        labelled: z.number().optional(),
        false_alarms: z.number().optional(),
      }),
    })
    .nullish(),
  exception_info: z.object({ exception_type: z.string() }).nullish(),
});

type Trial = z.infer<typeof trialResult>;

/** The rewards that say why a trial lost its reward, and what the gate calls each. */
const REASONS = [
  ["noticed", "noticed"],
  ["labelled", "labelled"],
  ["false_alarms", "false alarms"],
] as const;

/** Checks each task in a Harbor job against the target. A broken trial scores 0. */
export function gate(jobFolder: string): GateResult {
  const trials = trialFolders(jobFolder).map((folder) =>
    trialResult.parse(JSON.parse(readFileSync(join(folder, "result.json"), "utf8"))),
  );
  if (trials.length === 0) return { exitCode: 1, output: `no trials in ${jobFolder}\n` };

  const rows = [...Map.groupBy(trials, (trial) => trial.task_name)].map(([name, own]) =>
    taskRow(name, own),
  );
  const below = rows.filter((row) => row.below).length;
  const nameWidth = Math.max(...rows.map((row) => row.name.length));
  const lines = rows.map((row) => `${row.name.padEnd(nameWidth)}  ${row.text}`);
  const verdict = below === 0 ? "eval:gate passed" : `eval:gate failed · ${below} below target`;
  return { exitCode: below === 0 ? 0 : 1, output: `${[...lines, verdict].join("\n")}\n` };
}

function taskRow(name: string, trials: Trial[]) {
  const mean = meanOf(trials.map((trial) => trial.verifier_result?.rewards.reward ?? 0));
  const broke = trials.filter((trial) => trial.exception_info).length;
  const score = `${mean.toFixed(2)} over ${trials.length} trials${broke > 0 ? ` (${broke} broke)` : ""}`;
  const below = mean < TARGET;
  const against = `target ${TARGET.toFixed(2)}${below ? ", below" : ""}`;
  return {
    name,
    below,
    text: [`${score}, ${against}`, ...reasons(trials)].join(" · "),
  };
}

/** The mean of each reason over the trials that carry it, such as `false alarms 0.50`. */
function reasons(trials: Trial[]): string[] {
  return REASONS.flatMap(([key, label]) => {
    const carried = trials.flatMap((trial) => trial.verifier_result?.rewards[key] ?? []);
    return carried.length === 0 ? [] : [`${label} ${meanOf(carried).toFixed(2)}`];
  });
}

function meanOf(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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
    const { exitCode, output } = gate(jobFolder);
    process.stdout.write(output);
    process.exitCode = exitCode;
  }
}
