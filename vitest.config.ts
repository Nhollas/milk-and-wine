import { configDefaults, defineConfig, type TestUserConfig } from "vitest/config";

const testFolders = ["src", "tests", "tools"];

const levels = ["service", "integration", "system", "smoke"] as const;

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
          exclude: [...configDefaults.exclude, ...levels.flatMap((level) => testsAt(level))],
          ...interceptedHttp,
        },
      },
      {
        extends: true,
        test: {
          name: { label: "service", color: "cyan" },
          include: testsAt("service"),
          ...interceptedHttp,
        },
      },
      {
        extends: true,
        test: {
          name: { label: "integration", color: "blue" },
          include: testsAt("integration"),
          ...interceptedHttp,
        },
      },
      {
        extends: true,
        test: {
          name: { label: "system", color: "magenta" },
          include: testsAt("system"),
          ...interceptedHttp,
        },
      },
      {
        extends: true,
        test: {
          name: { label: "smoke", color: "yellow" },
          include: testsAt("smoke"),
          testTimeout: 15_000,
        },
      },
    ],
  },
});
