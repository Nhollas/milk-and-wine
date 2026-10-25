import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { type Edit, type EvalCase, matching, readCases, testedRows } from "./cases.ts";
import { judge, type Judgement } from "./intent-judge.ts";
import { inPool } from "./pool.ts";
import { type Flag, flagsIn, foundGap, type Found } from "./score.ts";
import { inWorkspace } from "./workspace.ts";

type Job = {
  name: string;
  subject: string;
  rows: string[];
  weaken: Edit[];
  /** The case being judged, or nothing when the tests are judged as they are. */
  evalCase: EvalCase | undefined;
};

type Attempt = { job: Job; judgement: Judgement; found: Found | undefined };

function jobsFor(cases: EvalCase[], root: string, withControl: boolean): Job[] {
  const planted = cases.map((evalCase) => ({
    name: `${evalCase.subject}/${evalCase.id}`,
    subject: evalCase.subject,
    rows: [evalCase.row],
    weaken: evalCase.weaken,
    evalCase,
  }));
  const control = withControl
    ? [...new Set(cases.map((evalCase) => evalCase.subject))].map((subject) => ({
        name: `${subject} as it is`,
        subject,
        rows: [...testedRows(root, subject).keys()],
        weaken: [],
        evalCase: undefined,
      }))
    : [];
  return [...planted, ...control];
}

async function attempt(job: Job, root: string, definition: string | undefined): Promise<Attempt> {
  const judgement = await inWorkspace(root, job.weaken, (directory) =>
    judge(directory, { subject: job.subject, rows: job.rows, definition }),
  ).catch((error: unknown): Judgement => ({
    verdicts: undefined,
    failure: String(error),
    warnings: [],
    costUsd: 0,
    seconds: 0,
    reply: "",
  }));
  const found = job.evalCase === undefined ? undefined : foundGap(job.evalCase, judgement);
  process.stdout.write(judgement.failure === undefined ? "." : "x");
  return { job, judgement, found };
}

async function runJudge(args: string[], root: string): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      subject: { type: "string" },
      case: { type: "string" },
      split: { type: "string", default: "dev" },
      runs: { type: "string", default: "3" },
      parallel: { type: "string", default: "4" },
      judge: { type: "string" },
      "no-control": { type: "boolean", default: false },
    },
  });
  if (values.split !== "dev" && values.split !== "heldout") {
    process.stdout.write("--split is dev or heldout\n");
    return 1;
  }
  const split = values.split;
  const runs = Number(values.runs);
  const cases = matching(readCases(root), { subject: values.subject, id: values.case }).filter(
    (evalCase) => evalCase.split === split,
  );
  if (cases.length === 0) {
    process.stdout.write(`no ${split} cases match\n`);
    return 1;
  }
  const definition = values.judge === undefined ? undefined : resolve(values.judge);
  const jobs = jobsFor(cases, root, !values["no-control"]);
  const queue = Array.from({ length: runs }, () => jobs).flat();

  process.stdout.write(`${jobs.length} jobs x ${runs} runs on ${split}: `);
  const attempts = await inPool(queue, Number(values.parallel), (job) =>
    attempt(job, root, definition),
  );
  process.stdout.write("\n\n");

  const saved = save(attempts, root);
  report(attempts, jobs, runs, split);
  process.stdout.write(`\nverdicts saved in ${saved}\n`);
  return 0;
}

function out(line = ""): void {
  process.stdout.write(`${line}\n`);
}

function report(attempts: Attempt[], jobs: Job[], runs: number, split: string): void {
  const planted = jobs.filter((job) => job.evalCase);
  const nameWidth = Math.max(...planted.map((job) => job.name.length));

  out(`${"case".padEnd(nameWidth)}  part  row   (flagged in n of ${runs} runs)`);
  let partHits = 0;
  let rowHits = 0;
  let scored = 0;
  for (const job of planted) {
    const own = attempts.filter((each) => each.job === job);
    const part = own.filter((each) => each.found?.part === true).length;
    const row = own.filter((each) => each.found?.row === true).length;
    partHits += part;
    rowHits += row;
    scored += own.filter((each) => each.found?.scored === true).length;
    out(
      `${job.name.padEnd(nameWidth)}  ${part}/${runs}   ${row}/${runs}${part > 0 && part < runs ? "   flaky" : ""}`,
    );
  }
  const total = planted.length * runs;
  out(`\nfound the planted part   ${partHits} of ${total}   (${percent(partHits, total)})`);
  out(`flagged its row          ${rowHits} of ${total}   (${percent(rowHits, total)})`);
  out(`not scored               ${total - scored} of ${total}`);

  for (const job of jobs.filter((each) => !each.evalCase)) {
    const own = attempts.filter(
      (each) => each.job === job && each.judgement.verdicts !== undefined,
    );
    out(
      `\n${job.name}: parts flagged, to triage (a gap to close, or a false alarm), over ${own.length} runs`,
    );
    const counts = new Map<string, number>();
    for (const flag of own.flatMap((each) => flagsIn(each.judgement))) {
      const key = describe(flag);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    if (counts.size === 0) out("  none");
    for (const [key, count] of [...counts].toSorted((a, b) => b[1] - a[1]))
      out(`  ${count}/${own.length}  ${key}`);
  }

  const failures = attempts.filter((each) => each.judgement.failure !== undefined);
  const warnings = attempts.flatMap((each) => each.judgement.warnings);
  out(`\nunusable judgements: ${failures.length} of ${attempts.length}`);
  for (const failure of new Set(
    failures.map((each) => `${each.job.name}: ${each.judgement.failure}`),
  )) {
    out(`  ${failure.slice(0, 200)}`);
  }
  out(
    `inconsistent verdicts: ${warnings.length}${warnings.length > 0 ? ` (for example ${warnings[0]})` : ""}`,
  );

  const cost = attempts.reduce((sum, each) => sum + each.judgement.costUsd, 0);
  const seconds = attempts.map((each) => each.judgement.seconds);
  out(
    `cost: $${cost.toFixed(2)} over ${attempts.length} judgements, ${Math.max(...seconds).toFixed(0)}s at most (${split})`,
  );
}

function describe({ row, side, part }: Flag): string {
  return `${row} ${side} "${part.part}" ${part.verdict}`;
}

function percent(part: number, whole: number): string {
  return whole === 0 ? "-" : `${Math.round((100 * part) / whole)}%`;
}

function save(attempts: Attempt[], root: string): string {
  const folder = join("reports", "intent-evals", new Date().toISOString().replaceAll(":", "-"));
  mkdirSync(join(root, folder), { recursive: true });
  const rows = attempts.map(({ job, judgement, found }) => ({ job: job.name, found, judgement }));
  writeFileSync(join(root, folder, "judgements.json"), `${JSON.stringify(rows, null, 2)}\n`);
  return folder;
}

if (import.meta.main) process.exitCode = await runJudge(process.argv.slice(2), process.cwd());
