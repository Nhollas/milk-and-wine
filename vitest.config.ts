import { configDefaults, defineConfig, type TestUserConfig } from "vitest/config";

const testFolders = ["src", "tools", ".claude", "evals"];

// Fixtures and tasks are laid out like this repository, but their tests run only through the evals.
const examples = ["evals/*/fixtures/**", "evals/*/judge-*/**"];

// A unit test has no level in its file name, so it runs in the unit project.
const levels = ["integration", "system"] as const;

type Level = (typeof levels)[number];

function testsAt(level: Level) {
  return testFolders.map((folder) => `${folder}/**/*.${level}.test.ts`);
}

const interceptedHttp = {
  setupFiles: ["src/tests/support/http-interceptor.setup.ts"],
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
            ...examples,
            ...levels.flatMap((level) => testsAt(level)),
          ],
          ...interceptedHttp,
        },
      },
      {
        extends: true,
        test: {
          name: { label: "integration", color: "blue" },
          include: testsAt("integration"),
          exclude: [...configDefaults.exclude, ...examples],
          ...interceptedHttp,
        },
      },
      {
        extends: true,
        test: {
          name: { label: "system", color: "magenta" },
          include: testsAt("system"),
          exclude: [...configDefaults.exclude, ...examples],
          ...interceptedHttp,
        },
      },
    ],
  },
});
