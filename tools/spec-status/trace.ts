import { checkOutRevision, workingTree } from "./repository.ts";
import { readSubjects, verifiedLabel, type Problem, type Row, type Subject } from "./specs.ts";
import { listTestsAtLevels, type TestAtLevel } from "./tests.ts";

export type Status = "delivered" | "proposed" | "sign-off";

export type RowStatus = {
  subject: string;
  id: string;
  verified: string;
  status: Status;
  proof: string;
};

export type Trace = { subjects: Subject[]; rows: RowStatus[]; problems: Problem[] };

export async function trace(root: string): Promise<Trace> {
  const { subjects, problems: specProblems } = readSubjects(workingTree(root));
  const { tests, problems: collectProblems } = await listTestsAtLevels(root);
  return {
    subjects,
    rows: subjects.flatMap((subject) =>
      subject.rows.map((row) => statusOfRow(subject.name, row, tests)),
    ),
    problems: [...specProblems, ...collectProblems, ...testProblems(subjects, tests)],
  };
}

export async function traceRevision(root: string, ref: string): Promise<Trace> {
  using checkout = checkOutRevision(root, ref);
  return await trace(checkout.root);
}

export function regressions(base: Trace, current: Trace): Problem[] {
  return current.rows
    .filter((row) => row.status === "proposed")
    .filter((row) =>
      base.rows.some(
        (before) =>
          before.subject === row.subject && before.id === row.id && before.status === "delivered",
      ),
    )
    .map((row) => ({
      code: "regression",
      location: `${row.subject} ${row.id}`,
      message: `${row.id} of ${row.subject} was delivered on the base revision and is proposed now`,
    }));
}

export function countByStatus(rows: RowStatus[]): Record<Status, number> {
  const counts: Record<Status, number> = { delivered: 0, proposed: 0, "sign-off": 0 };
  for (const row of rows) counts[row.status]++;
  return counts;
}

function statusOfRow(subject: string, row: Row, tests: TestAtLevel[]): RowStatus {
  const withStatus = (status: Status, proof: string): RowStatus => ({
    subject,
    id: row.id,
    verified: verifiedLabel(row.verified),
    status,
    proof,
  });
  const { verified } = row;
  if (verified.kind === "dependency") return withStatus("delivered", verified.link);
  if (verified.kind === "manual") return withStatus("sign-off", verified.link);

  const testsNamingRow = tests.filter((test) => test.subject === subject && test.id === row.id);
  const testsAtRowLevel = testsNamingRow.filter((test) => test.level === verified.level);
  const delivering = testsAtRowLevel.find((test) => test.mode === "active");
  if (delivering) return withStatus("delivered", `${delivering.path} › "${delivering.title}"`);

  const todoOrSkipped = testsAtRowLevel[0];
  if (todoOrSkipped)
    return withStatus("proposed", `${todoOrSkipped.mode} in ${todoOrSkipped.path}`);

  const atWrongLevel = testsNamingRow[0];
  if (atWrongLevel)
    return withStatus("proposed", `wrong level: ${atWrongLevel.level} in ${atWrongLevel.path}`);

  return withStatus("proposed", "nothing yet");
}

function testProblems(subjects: Subject[], tests: TestAtLevel[]): Problem[] {
  return tests.flatMap((test): Problem[] => {
    const location = `${test.path}:${test.line}`;
    const subject = subjects.find((candidate) => candidate.name === test.subject);
    if (!subject) {
      return [
        { code: "unknown-subject", location, message: `no spec folder is named ${test.subject}` },
      ];
    }
    if (!test.id) {
      return [
        {
          code: "untagged-test",
          location,
          message: `"${test.title}" names no row of ${test.subject}`,
        },
      ];
    }
    if (!subject.rows.some((row) => row.id === test.id)) {
      return [
        { code: "unknown-id", location, message: `${test.id} is not a row of ${test.subject}` },
      ];
    }
    return [];
  });
}
