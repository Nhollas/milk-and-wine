import { workingTree } from "./repository.ts";
import { countByStatus, trace, type RowStatus } from "./trace.ts";

export type CommandResult = { exitCode: number; output: string };

export function runStatus(args: string[], root: string): CommandResult {
  const asJson = args.includes("--json");
  const subjectName = args.find((arg) => !arg.startsWith("--"));
  const { subjects, rows } = trace(workingTree(root));

  const selected = subjectName ? subjects.filter((subject) => subject.name === subjectName) : subjects;
  if (subjectName && selected.length === 0) return { exitCode: 1, output: `unknown subject: ${subjectName}\n` };

  const selectedRows = rows.filter((row) => selected.some((subject) => subject.name === row.subject));
  if (asJson) return { exitCode: 0, output: `${JSON.stringify(selectedRows, null, 2)}\n` };

  return {
    exitCode: 0,
    output: selected.map((subject) => formatSubject(subject.name, selectedRows.filter((row) => row.subject === subject.name))).join("\n"),
  };
}

export function formatSubject(name: string, rows: RowStatus[]): string {
  const counts = countByStatus(rows);
  const heading = `${name} · ${counts.delivered} delivered · ${counts.proposed} proposed · ${counts["sign-off"]} sign-off`;
  const table = [["ID", "Verified", "Status", "Proof"], ...rows.map((row) => [row.id, row.verified, row.status, row.proof])];
  const widths = [0, 1, 2].map((column) => Math.max(...table.map((cells) => (cells[column] ?? "").length)));
  const lines = table.map((cells) =>
    cells.map((cell, column) => (column < 3 ? cell.padEnd(widths[column] ?? 0) : cell)).join("  "),
  );
  return `${heading}\n\n${lines.map((line) => ` ${line}`.trimEnd()).join("\n")}\n`;
}

if (import.meta.main) {
  const { exitCode, output } = runStatus(process.argv.slice(2), process.cwd());
  process.stdout.write(output);
  process.exitCode = exitCode;
}
