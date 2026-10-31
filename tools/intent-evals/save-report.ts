import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ScoredRun } from "./runs.ts";

const REPORTS_FOLDER = "reports/intent-evals";

/**
 * Saves the report under reports/intent-evals/<commit>-<models>-<date>, with the runs as JSON and
 * each run's transcript beside it. Returns the folder, relative to root.
 */
export function saveReport(
  root: string,
  runs: ScoredRun[],
  text: string,
  now: Date = new Date(),
): string {
  const models = [...new Set(runs.map((run) => run.model))]
    .map((model) => fileSafe(model))
    .join("+");
  const date = now.toISOString().replaceAll(":", "-");
  const folder = `${REPORTS_FOLDER}/${commitOf(root)}-${models}-${date}`;
  mkdirSync(join(root, folder, "transcripts"), { recursive: true });

  const saved = runs.map(({ transcript, evalCase, ...run }, index) => {
    const file = `transcripts/${index + 1}-${fileSafe(run.model)}-${fileSafe(evalCase.id)}.jsonl`;
    writeFileSync(join(root, folder, file), transcript);
    return {
      case: evalCase.id,
      example: evalCase.example,
      kind: evalCase.kind,
      difficulty: evalCase.difficulty,
      ...run,
      transcript: file,
    };
  });
  writeFileSync(join(root, folder, "report.txt"), text);
  writeFileSync(join(root, folder, "runs.json"), `${JSON.stringify(saved, null, 2)}\n`);
  return folder;
}

function commitOf(root: string): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "uncommitted";
  }
}

function fileSafe(name: string): string {
  return name.replaceAll(/[^\w.-]+/gu, "-");
}
