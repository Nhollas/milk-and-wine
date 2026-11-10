import { configDefaults, defineConfig, type TestUserConfig } from "vitest/config";

const testFolders = ["src", "tests", "tools", ".claude"];

// Examples are laid out like this repository, but their tests run only through the intent evals.
// A benchmark task's tests run only through `bench:check` and in a trial.
const runElsewhere = [".claude/skills/intent-judge/evals/examples/**", "tools/benchmark/tasks/**"];

const levels = ["service", "integration", "system"] as const;

type Level = (typeof levels)[number];

function testsAt(level: Level) {
  return testFolders.map((folder) => `${folder}/**/*.${level}.test.ts`);
}

const interceptedHttp = {
  setupFiles: ["tests/support/http-interceptor.setup.ts"],
  testTimeout: 10_000,
} satisfies TestUserConfig;

export default defineConfig({
  test: {
    allowOnly: false,
    projects: [
      {
        extends: true,
        test: {
          name: { label: "unit", color: "white" },
          include: testFolders.map((folder) => `${folder}/**/*.test.ts`),
          exclude: [
            ...configDefaults.exclude,
            ...runElsewhere,
            ...levels.flatMap((level) => testsAt(level)),
          ],
          ...interceptedHttp,
        },
      },
      {
        extends: true,
        test: {
          name: { label: "service", color: "cyan" },
          include: testsAt("service"),
          exclude: [...configDefaults.exclude, ...runElsewhere],
          ...interceptedHttp,
        },
      },
      {
        extends: true,
        test: {
          name: { label: "integration", color: "blue" },
          include: testsAt("integration"),
          exclude: [...configDefaults.exclude, ...runElsewhere],
          ...interceptedHttp,
        },
      },
      {
        extends: true,
        test: {
          name: { label: "system", color: "magenta" },
          include: testsAt("system"),
          exclude: [...configDefaults.exclude, ...runElsewhere],
          ...interceptedHttp,
        },
      },
    ],
  },
});
