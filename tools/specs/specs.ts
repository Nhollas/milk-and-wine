import { posix } from "node:path";
import type { Repository } from "./repository.ts";

const TEST_LEVELS = ["unit", "integration", "system"] as const;

export type TestLevel = (typeof TEST_LEVELS)[number];

type Verified =
  | { kind: "test"; level: TestLevel }
  | { kind: "dependency"; link: string }
  | { kind: "manual"; link: string };

export type Scenario = { id: string; thenText: string; verified: Verified };

export type Subject = { name: string; path: string; scenarios: Scenario[] };

type Problem = { code: string; location: string; message: string };

const SPEC_PATH = /^specs\/(?:.+\/)?([^/]+)\/spec\.md$/u;
const SCENARIO_HEADER = ["id", "given", "when", "then", "verified"];
const MARKDOWN_LINK = /\[[^\]]*\]\(([^)]+)\)/u;

function subjectOfSpecPath(path: string): string | undefined {
  return SPEC_PATH.exec(path)?.[1];
}

function isTestLevel(value: string | undefined): value is TestLevel {
  return (TEST_LEVELS as readonly (string | undefined)[]).includes(value);
}

// A test file is <subject>[.<part>][.<level>].test.ts, and a file with no level is a unit test.
export function levelOfTestFile(path: string): TestLevel | undefined {
  const parts = posix.basename(path).split(".");
  if (parts.length < 3 || !path.endsWith(".test.ts")) return undefined;
  const named = parts.at(-3);
  return parts.length >= 4 && isTestLevel(named) ? named : "unit";
}

export function readSubjects(repository: Repository): { subjects: Subject[]; problems: Problem[] } {
  const subjects: Subject[] = [];
  const problems: Problem[] = [];

  for (const path of repository.filePaths().toSorted()) {
    const name = subjectOfSpecPath(path);
    if (!name) continue;
    const scenarios: Scenario[] = [];
    for (const { cells, line } of scenarioLines(repository.read(path))) {
      const [id = "", , , thenText = "", verifiedCell = ""] = cells;
      const location = `${path}:${line}`;
      const verified = parseVerified(verifiedCell, path);
      if (!verified) {
        problems.push({
          code: "invalid-verified",
          location,
          message: `${id} has Verified "${verifiedCell}"`,
        });
        continue;
      }
      if (scenarios.some((scenario) => scenario.id === id)) {
        problems.push({
          code: "duplicate-id",
          location,
          message: `${id} appears more than once in ${name}`,
        });
        continue;
      }
      scenarios.push({ id, thenText, verified });
    }
    subjects.push({ name, path, scenarios });
  }

  return { subjects, problems };
}

function* scenarioLines(markdown: string): Generator<{ cells: string[]; line: number }> {
  const lines = markdown.split("\n");
  let inScenarioTable = false;
  for (const [index, text] of lines.entries()) {
    if (!text.trimStart().startsWith("|")) {
      inScenarioTable = false;
      continue;
    }
    const cells = splitCells(text);
    if (cells.map((cell) => cell.toLowerCase()).join("|") === SCENARIO_HEADER.join("|")) {
      inScenarioTable = true;
      continue;
    }
    if (!inScenarioTable || cells.every((cell) => /^:?-+:?$/u.test(cell))) continue;
    yield { cells, line: index + 1 };
  }
}

function splitCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/u, "")
    .replace(/(?<!\\)\|$/u, "")
    .split(/(?<!\\)\|/u)
    .map((cell) => cell.trim());
}

function parseVerified(cell: string, specPath: string): Verified | undefined {
  const text = cell.replaceAll("`", "").trim();
  if (isTestLevel(text)) return { kind: "test", level: text };
  const match = /^(dependency|manual)\s+(.+)$/u.exec(text);
  if (!match) return undefined;
  const [, kind, target = ""] = match;
  const link = resolveLink(MARKDOWN_LINK.exec(target)?.[1] ?? target, specPath);
  return kind === "dependency" ? { kind: "dependency", link } : { kind: "manual", link };
}

function resolveLink(link: string, specPath: string): string {
  return /^[a-z]+:/iu.test(link) ? link : posix.join(posix.dirname(specPath), link);
}
