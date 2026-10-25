// Scores the intent judge's verdicts against the gaps known to be in the reminders tests.
// Usage: node docs/research/judge-trial/score.ts <folder of verdicts> ...
// A folder holds one verdict per variant, as run.sh's .jsonl or results/'s .json.
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

type Part = { part: string; verdict: string; why?: string };
type Verdicts = Record<string, { given?: Part[]; then?: Part[] }>;
type Gap = { name: string; row: string; side: "given" | "then"; part: RegExp };

// Each was confirmed by planting the bug it points at: the whole suite still passes.
const REAL_GAPS: Gap[] = [
  { name: "B1 today in UTC", row: "B1", side: "given", part: /UTC/u },
  { name: "B1 no reminder recorded today", row: "B1", side: "given", part: /recorded today/u },
  { name: "B1 no reminder recorded today", row: "B2", side: "given", part: /recorded today/u },
  { name: "B5 any other answer refused", row: "B5", side: "then", part: /other answer/u },
  {
    name: "B4 finished only when the job finishes",
    row: "B4",
    side: "given",
    part: /handled every/u,
  },
  { name: "B5 any 2xx accepted", row: "B5", side: "then", part: /2xx/u },
  { name: "B3 no retry within a run (its Why)", row: "B3", side: "then", part: /carries on/u },
  // Caught, but only by a test whose row doesn't promise it.
  {
    name: "B1 overdue by more than a day",
    row: "B1",
    side: "given",
    part: /^(?!.*UTC).*before today/u,
  },
  { name: "B5 keeps NOTIFY_URL's path", row: "B5", side: "then", part: /NOTIFY_URL/u },
];

// Flags checked by hand and found wrong.
const FALSE_ALARMS: Gap[] = [
  // The service only ever sees a refusal; B5 proves an unreachable API becomes one.
  { name: "B3 can't be reached", row: "B3", side: "given", part: /reached/u },
  // No row says the job logs nothing for an accepted loan.
  {
    name: "B3 failed logged for accepted loans",
    row: "B3",
    side: "then",
    part: /reminder\.failed/u,
  },
  // B3's test proves the order, as its own reason said.
  { name: "B1 asks before it records", row: "B1", side: "then", part: /records a reminder/u },
  // The due-today boundary is tested; a loan due far ahead being sent isn't a plausible bug.
  { name: "B2 due far in the future", row: "B2", side: "given", part: /overdue/u },
];

const PLANTED_GAPS: Record<string, Gap[]> = {
  "1-b1-drops-sent-on": [{ name: "B1 for today", row: "B1", side: "then", part: /for today/u }],
  "2-b2-drops-not-yet-overdue": [
    { name: "B2 isn't overdue", row: "B2", side: "given", part: /overdue/u },
  ],
  "3-b4-drops-failed-count": [
    { name: "B4 failed count", row: "B4", side: "then", part: /failed/u },
  ],
  "4-b5-drops-template": [{ name: "B5 template", row: "B5", side: "then", part: /template/u }],
  "5-b5-drops-unreachable": [
    { name: "B5 failed connection", row: "B5", side: "then", part: /failed connection/u },
  ],
  "weaker-b3-test": [
    { name: "B3 loanId", row: "B3", side: "then", part: /loanId/u },
    { name: "B3 error", row: "B3", side: "then", part: /error/u },
  ],
};

// Flags that follow from a planted gap, so they aren't false alarms.
const CONSEQUENCES: Record<string, Gap[]> = {
  "2-b2-drops-not-yet-overdue": [{ name: "", row: "B2", side: "then", part: /./u }],
  "5-b5-drops-unreachable": [
    { name: "", row: "B3", side: "given", part: /reached/u },
    { name: "", row: "B5", side: "then", part: /unreachable/u },
  ],
};

const FLAGGED = new Set(["weak", "missing"]);

function verdictsIn(path: string): Verdicts | undefined {
  const text = readFileSync(path, "utf8");
  const result = path.endsWith(".jsonl")
    ? text
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { type?: string; result?: string })
        .find((event) => event.type === "result")?.result
    : text;
  const json = result?.match(/\{[\s\S]*\}/u)?.[0];
  return json === undefined ? undefined : (JSON.parse(json) as Verdicts);
}

function matches(gap: Gap, row: string, side: string, part: Part): boolean {
  return gap.row === row && gap.side === side && gap.part.test(part.part);
}

const found = new Map<string, number>();
const judged = new Map<string, number>();
const falseAlarms: string[] = [];
const unexpected: string[] = [];
const count = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

for (const folder of process.argv.slice(2)) {
  for (const file of readdirSync(folder).filter((name) => /\.jsonl?$/u.test(name))) {
    const variant = basename(file).replace(/\.jsonl?$/u, "");
    const verdicts = verdictsIn(join(folder, file));
    const gaps = [...REAL_GAPS, ...(PLANTED_GAPS[variant] ?? [])];
    for (const name of new Set(gaps.map((gap) => gap.name))) count(judged, name);
    if (verdicts === undefined) {
      unexpected.push(`${folder}/${variant}: no verdicts`);
      continue;
    }
    const flags = Object.entries(verdicts).flatMap(([row, sides]) =>
      (["given", "then"] as const).flatMap((side) =>
        (sides[side] ?? [])
          .filter((part) => FLAGGED.has(part.verdict))
          .map((part) => ({ row, side, part })),
      ),
    );
    for (const name of new Set(gaps.map((gap) => gap.name))) {
      const named = gaps.filter((gap) => gap.name === name);
      const hit = flags.some((flag) =>
        named.some((gap) => matches(gap, flag.row, flag.side, flag.part)),
      );
      if (hit) count(found, name);
    }
    const explained = [...gaps, ...(CONSEQUENCES[variant] ?? [])];
    for (const flag of flags) {
      if (explained.some((gap) => matches(gap, flag.row, flag.side, flag.part))) continue;
      const line = `${variant}: ${flag.row} ${flag.side} "${flag.part.part}" ${flag.part.verdict}`;
      const known = FALSE_ALARMS.some((gap) => matches(gap, flag.row, flag.side, flag.part));
      (known ? falseAlarms : unexpected).push(line);
    }
  }
}

for (const [name, total] of judged) {
  process.stdout.write(`${String(found.get(name) ?? 0).padStart(2)} of ${total}  ${name}\n`);
}
process.stdout.write(`\nFalse alarms: ${falseAlarms.length}\n`);
process.stdout.write(`Unexpected flags, to check by hand: ${unexpected.length}\n`);
for (const flag of unexpected) process.stdout.write(`  ${flag}\n`);
