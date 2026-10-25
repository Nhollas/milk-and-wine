import { realpathSync } from "node:fs";
import { relative } from "node:path";
import { configDefaults } from "vitest/config";
import { createVitest } from "vitest/node";
import { isTestLevel, TEST_LEVELS, type Problem, type TestLevel } from "./specs.ts";

type TestMode = "active" | "todo" | "skipped";

export type TestAtLevel = {
  subject: string;
  level: TestLevel;
  path: string;
  line: number;
  title: string;
  id: string | undefined;
  mode: TestMode;
};

const TEST_FILE_NAME = /(?:^|\/)([^/]+)\.test\.ts$/u;
const ROW_ID = /^(B\d+):/u;

export async function listTestsAtLevels(
  root: string,
): Promise<{ tests: TestAtLevel[]; problems: Problem[] }> {
  const vitest = await createVitest({
    root,
    config: false,
    watch: false,
    includeTaskLocation: true,
    passWithNoTests: true,
    include: [`**/*.{${TEST_LEVELS.join(",")}}.test.ts`],
    exclude: [...configDefaults.exclude, "**/.*/**"],
    execArgv: ["--disable-warning=ExperimentalWarning"],
  });
  try {
    const { testModules } = await vitest.collect(undefined, { staticParse: false });
    const tests: TestAtLevel[] = [];
    const problems: Problem[] = [];
    for (const testModule of testModules.toSorted((a, b) => a.moduleId.localeCompare(b.moduleId))) {
      const path = relative(realpathSync(root), testModule.moduleId).split("\\").join("/");
      const file = fileOf(path);
      if (!file) continue;
      const [error] = testModule.errors();
      if (error) {
        problems.push({ code: "collect-error", location: path, message: error.message });
        continue;
      }
      for (const testCase of testModule.children.allTests()) {
        tests.push({
          ...file,
          line: testCase.location?.line ?? 0,
          title: testCase.fullName,
          id: ROW_ID.exec(testCase.fullName)?.[1],
          mode:
            testCase.options.mode === "todo"
              ? "todo"
              : testCase.options.mode === "skip"
                ? "skipped"
                : "active",
        });
      }
    }
    return { tests, problems };
  } finally {
    await vitest.close();
  }
}

function fileOf(path: string): Pick<TestAtLevel, "subject" | "level" | "path"> | undefined {
  const fileName = TEST_FILE_NAME.exec(path)?.[1];
  if (!fileName) return undefined;
  const parts = fileName.split(".");
  const level = parts.length > 1 ? parts.at(-1) : undefined;
  if (!isTestLevel(level)) return undefined;
  return { subject: parts[0] ?? "", level, path };
}
