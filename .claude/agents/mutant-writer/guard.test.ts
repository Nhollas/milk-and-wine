import { expect, test } from "vitest";
import { repoWithFiles } from "../../../tests/support/repo-with-files.ts";
import { blockReasonOf } from "./guard.ts";

const ENV = {
  SPEC_FILES: "**/spec.md",
  TEST_FILES: "**/*.test.ts",
  TEST_SUPPORT_FILES: "**/support/**",
};

const LAYOUT = {
  "apps/loans-api/spec.md": "",
  "apps/loans-api/mutants.json": "{}",
  "apps/loans-api/loans-api.test.ts": "",
  "apps/loans-api/support/fake-clock.ts": "",
  "apps/loans-api/loans-app.ts": "",
};

function call(tool: string, path?: string): string {
  return JSON.stringify({
    tool_name: tool,
    tool_input: path === undefined ? {} : { file_path: path },
  });
}

test.each([
  { tool: "Read", path: "apps/loans-api/spec.md" },
  { tool: "Read", path: "apps/loans-api/loans-app.ts" },
  { tool: "Read", path: "apps/loans-api/mutants.json" },
  { tool: "Glob", path: "apps" },
  { tool: "Write", path: "apps/loans-api/mutants.json" },
  { tool: "Edit", path: "apps/loans-api/mutants.json" },
  { tool: "SubagentHandback", path: undefined },
])("lets the mutant writer use $tool on $path", ({ tool, path }) => {
  const root = repoWithFiles(LAYOUT);

  expect(blockReasonOf(call(tool, path), root, ENV)).toBeUndefined();
});

test.each([
  {
    tool: "Read",
    path: "apps/loans-api/loans-api.test.ts",
    reason: "The mutant writer never reads tests or their support files.",
  },
  {
    tool: "Read",
    path: "apps/loans-api/support/fake-clock.ts",
    reason: "The mutant writer never reads tests or their support files.",
  },
  {
    tool: "Read",
    path: "/elsewhere/loans-app.ts",
    reason: "The mutant writer reads only this repository.",
  },
  {
    tool: "Write",
    path: "apps/loans-api/loans-app.ts",
    reason: "The mutant writer writes only the mutants.json beside a spec.",
  },
  {
    tool: "Write",
    path: "apps/mutants.json",
    reason: "The mutant writer writes only the mutants.json beside a spec.",
  },
  { tool: "Bash", path: undefined, reason: "The mutant writer can't use Bash." },
])("blocks the mutant writer from $tool on $path", ({ tool, path, reason }) => {
  const root = repoWithFiles(LAYOUT);

  expect(blockReasonOf(call(tool, path), root, ENV)).toBe(reason);
});

test("blocks every call when the patterns aren't set", () => {
  const root = repoWithFiles({ "apps/loans-api/loans-app.ts": "" });

  expect(blockReasonOf(call("Read", "apps/loans-api/loans-app.ts"), root, {})).toBe(
    "The mutant writer can't tell what any file is: SPEC_FILES, TEST_FILES, TEST_SUPPORT_FILES must be set in .claude/settings.json.",
  );
});
