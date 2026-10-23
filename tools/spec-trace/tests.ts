import type { Repository } from "./repository.ts";
import { isTestLevel, type TestLevel } from "./specs.ts";

export type TestMode = "active" | "todo" | "skipped";

export type TestAtLevel = {
  subject: string;
  level: TestLevel;
  path: string;
  line: number;
  title: string;
  id: string | undefined;
  mode: TestMode;
};

const TEST_FILE_NAME = /(?:^|\/)([^/]+)\.test\.ts$/;
const TEST_CALL = /\b(?:test|it)((?:\.(?:only|skip|todo|fails|concurrent|sequential))*)\s*\(\s*(["'`])((?:\\.|(?!\2)[^\\])*)\2/g;
const ROW_ID = /^(B\d+):/;

export function readTestsAtLevels(repository: Repository): TestAtLevel[] {
  return repository
    .filePaths()
    .sort()
    .flatMap((path) => {
      const fileName = TEST_FILE_NAME.exec(path)?.[1];
      if (!fileName) return [];
      const parts = fileName.split(".");
      const subject = parts[0] ?? "";
      const level = parts.length > 1 ? parts.at(-1) : undefined;
      if (!isTestLevel(level)) return [];
      return testsIn(repository.read(path), { subject, level, path });
    });
}

function testsIn(source: string, file: Pick<TestAtLevel, "subject" | "level" | "path">): TestAtLevel[] {
  return [...source.matchAll(TEST_CALL)].map((match) => {
    const modifiers = match[1] ?? "";
    const title = match[3] ?? "";
    return {
      ...file,
      line: source.slice(0, match.index).split("\n").length,
      title,
      id: ROW_ID.exec(title)?.[1],
      mode: modifiers.includes(".todo") ? "todo" : modifiers.includes(".skip") ? "skipped" : "active",
    };
  });
}
