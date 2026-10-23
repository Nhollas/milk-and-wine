import type { Repository } from "./repository.ts";
import { describeVerified, readSubjects, type Problem, type Row, type Subject } from "./specs.ts";
import { readTests, type NamedTest } from "./tests.ts";

export type Status = "delivered" | "proposed" | "sign-off";

export type RowStatus = { subject: string; id: string; verified: string; status: Status; proof: string };

export type Trace = { subjects: Subject[]; rows: RowStatus[]; problems: Problem[] };

export function trace(repository: Repository): Trace {
  const { subjects, problems } = readSubjects(repository);
  const tests = readTests(repository);
  return {
    subjects,
    rows: subjects.flatMap((subject) => subject.rows.map((row) => rowStatus(subject.name, row, tests))),
    problems: [...problems, ...testProblems(subjects, tests)],
  };
}

export function regressions(base: Trace, current: Trace): Problem[] {
  return current.rows
    .filter((row) => row.status === "proposed")
    .filter((row) => base.rows.some((was) => was.subject === row.subject && was.id === row.id && was.status === "delivered"))
    .map((row) => ({
      code: "regression",
      where: `${row.subject} ${row.id}`,
      message: `${row.id} of ${row.subject} was delivered on the base revision and is proposed now`,
    }));
}

export function countByStatus(rows: RowStatus[]): Record<Status, number> {
  const counts: Record<Status, number> = { delivered: 0, proposed: 0, "sign-off": 0 };
  for (const row of rows) counts[row.status]++;
  return counts;
}

function rowStatus(subject: string, row: Row, tests: NamedTest[]): RowStatus {
  const base = { subject, id: row.id, verified: describeVerified(row.verified) };
  const { verified } = row;
  if (verified.kind === "dependency") return { ...base, status: "delivered", proof: verified.link };
  if (verified.kind === "manual") return { ...base, status: "sign-off", proof: verified.link };

  const naming = tests.filter((test) => test.subject === subject && test.id === row.id);
  const atLevel = naming.filter((test) => test.level === verified.level);
  const delivering = atLevel.find((test) => test.mode === "active");
  if (delivering) return { ...base, status: "delivered", proof: `${delivering.path} › "${delivering.title}"` };

  const waiting = atLevel[0];
  if (waiting) return { ...base, status: "proposed", proof: `${waiting.mode} in ${waiting.path}` };

  const elsewhere = naming[0];
  if (elsewhere) return { ...base, status: "proposed", proof: `wrong level: ${elsewhere.level} in ${elsewhere.path}` };

  return { ...base, status: "proposed", proof: "nothing yet" };
}

function testProblems(subjects: Subject[], tests: NamedTest[]): Problem[] {
  return tests.flatMap((test): Problem[] => {
    const where = `${test.path}:${test.line}`;
    const subject = subjects.find((candidate) => candidate.name === test.subject);
    if (!subject) {
      return [{ code: "unknown-subject", where, message: `no spec folder is named ${test.subject}` }];
    }
    if (!test.id) {
      return [{ code: "untagged-test", where, message: `"${test.title}" names no row of ${test.subject}` }];
    }
    if (!subject.rows.some((row) => row.id === test.id)) {
      return [{ code: "unknown-id", where, message: `${test.id} is not a row of ${test.subject}` }];
    }
    return [];
  });
}
