import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { type Edit, type EvalCase, matching, readCases, testedRows } from "./cases.ts";
import { JUDGE_FILE, judge, type Judgement, type Misalignment, modelOf } from "./intent-judge.ts";
import { inPool } from "./pool.ts";
import { foundGap, type Found } from "./score.ts";
import { inWorkspace } from "./workspace.ts";

type Job = {
  name: string;
  subject: string;
  rows: string[];
  weaken: Edit[];
  /** The case being judged, or nothing when the tests are judged as they are. */
  evalCase: EvalCase | undefined;
};

/** A model to judge with, and whether it replaces the one the definition names. */
type Model = { name: string; override: string | undefined };

type Attempt = { job: Job; model: string; judgement: Judgement; found: Found | undefined };

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

async function attempt(
  job: Job,
  model: Model,
  root: string,
  definition: string | undefined,
): Promise<Attempt> {
  const judgement = await inWorkspace(root, job.weaken, (directory) =>
    judge(directory, {
      subject: job.subject,
      rows: job.rows,
      definition,
      model: model.override,
    }),
  ).catch((error: unknown): Judgement => ({
    misalignments: undefined,
    checklist: undefined,
    failure: String(error),
    costUsd: 0,
    seconds: 0,
    transcript: "",
  }));
  const found = job.evalCase === undefined ? undefined : foundGap(job.evalCase, judgement);
  process.stdout.write(judgement.failure === undefined ? "." : "x");
  return { job, model: model.name, judgement, found };
}

async function runJudge(args: string[], root: string): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      subject: { type: "string" },
      case: { type: "string" },
      split: { type: "string", default: "dev" },
      runs: { type: "string", default: "6" },
      parallel: { type: "string", default: "4" },
      judge: { type: "string" },
      models: { type: "string" },
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
  const models: Model[] =
    values.models === undefined
      ? [{ name: modelOf(definition ?? join(root, JUDGE_FILE)), override: undefined }]
      : values.models.split(",").map((name) => ({ name, override: name }));
  const jobs = jobsFor(cases, root, !values["no-control"]);
  const queue = Array.from({ length: runs }, () =>
    models.flatMap((model) => jobs.map((job) => ({ job, model }))),
  ).flat();

  process.stdout.write(
    `${jobs.length} jobs x ${models.length} models x ${runs} runs on ${split}: `,
  );
  const attempts = await inPool(queue, Number(values.parallel), ({ job, model }) =>
    attempt(job, model, root, definition),
  );
  process.stdout.write("\n\n");

  const saved = save(attempts, root);
  report(attempts, jobs, models, runs, split);
  process.stdout.write(`\njudgements and transcripts saved in ${saved}\n`);
  return 0;
}

function out(line = ""): void {
  process.stdout.write(`${line}\n`);
}

function report(
  attempts: Attempt[],
  jobs: Job[],
  models: Model[],
  runs: number,
  split: string,
): void {
  const planted = jobs.filter((job) => job.evalCase);
  const nameWidth = Math.max(
    ...jobs.map((job) => job.name.length),
    "found the planted part".length,
  );
  const columns = models.map((model) => model.name);
  const widest = percent(planted.length * runs, planted.length * runs);
  const columnWidth = Math.max(...columns.map((name) => name.length), widest.length) + 2;
  const row = (name: string, cells: string[]) =>
    out(`${name.padEnd(nameWidth)}  ${cells.map((cell) => cell.padEnd(columnWidth)).join("")}`);
  const of = (model: string) => attempts.filter((each) => each.model === model);

  out(`found the planted part, in n of ${runs} runs\n`);
  row("case", columns);
  for (const job of planted) {
    row(
      job.name,
      columns.map((model) => {
        const found = of(model).filter((each) => each.job === job && each.found?.part === true);
        return `${found.length}/${runs}`;
      }),
    );
  }
  const total = planted.length * runs;
  row(
    "found the planted part",
    columns.map((model) => {
      const found = of(model).filter((each) => each.found?.part === true).length;
      return percent(found, total);
    }),
  );
  row(
    "not scored",
    columns.map((model) => {
      const scored = of(model).filter((each) => each.found?.scored === true).length;
      return `${total - scored}`;
    }),
  );

  for (const job of jobs.filter((each) => !each.evalCase)) {
    out(`\n${job.name}: misalignments, to triage (a gap to close, or a false alarm)\n`);
    const counts = new Map<string, Map<string, number>>();
    for (const each of attempts.filter((attempted) => attempted.job === job)) {
      for (const found of each.judgement.misalignments ?? []) {
        const byModel = counts.get(describe(found)) ?? new Map<string, number>();
        byModel.set(each.model, (byModel.get(each.model) ?? 0) + 1);
        counts.set(describe(found), byModel);
      }
    }
    if (counts.size === 0) out("  none");
    for (const [key, byModel] of counts) {
      const cells = columns.map((model) => `${model} ${byModel.get(model) ?? 0}/${runs}`);
      out(`  ${cells.join("  ")}  ${key}`);
    }
  }

  const failures = attempts.filter((each) => each.judgement.failure !== undefined);
  out(`\nunusable judgements: ${failures.length} of ${attempts.length}`);
  for (const failure of new Set(
    failures.map((each) => `${each.model} ${each.job.name}: ${each.judgement.failure}`),
  )) {
    out(`  ${failure.slice(0, 200)}`);
  }

  for (const model of columns) {
    const own = of(model);
    const cost = own.reduce((sum, each) => sum + each.judgement.costUsd, 0);
    const seconds = own.map((each) => each.judgement.seconds);
    out(
      `${model}: $${cost.toFixed(2)} over ${own.length} judgements, ${Math.max(...seconds).toFixed(0)}s at most (${split})`,
    );
  }
}

function describe({ row, says, where }: Misalignment): string {
  return `${row} "${says}"${where === null ? "" : ` at ${where}`}`;
}

function percent(part: number, whole: number): string {
  return whole === 0 ? "-" : `${part}/${whole} (${Math.round((100 * part) / whole)}%)`;
}

function save(attempts: Attempt[], root: string): string {
  const folder = join("reports", "intent-evals", new Date().toISOString().replaceAll(":", "-"));
  mkdirSync(join(root, folder, "transcripts"), { recursive: true });
  const rows = attempts.map(({ job, model, judgement, found }, index) => {
    const { transcript, ...rest } = judgement;
    const file = join(
      "transcripts",
      `${index}-${model}-${job.name.replaceAll(/\W+/gu, "-")}.jsonl`,
    );
    writeFileSync(join(root, folder, file), transcript);
    return { job: job.name, model, found, transcript: file, judgement: rest };
  });
  writeFileSync(join(root, folder, "judgements.json"), `${JSON.stringify(rows, null, 2)}\n`);
  return folder;
}

if (import.meta.main) process.exitCode = await runJudge(process.argv.slice(2), process.cwd());
