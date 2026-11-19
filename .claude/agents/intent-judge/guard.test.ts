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
  { tool: "Read", path: "apps/loans-api/loans-api.test.ts" },
  { tool: "Read", path: "apps/loans-api/support/fake-clock.ts" },
  { tool: "Glob", path: "apps" },
  { tool: "Glob", path: undefined },
  { tool: "StructuredOutput", path: undefined },
])("lets the judge use $tool on $path", ({ tool, path }) => {
  const root = repoWithFiles(LAYOUT);

  expect(blockReasonOf(call(tool, path), root, ENV)).toBeUndefined();
});

test.each([
  { tool: "Read", path: "apps/loans-api/loans-app.ts" },
  { tool: "Read", path: "apps/loans-api/mutants.json" },
  { tool: "Read", path: "README.md" },
  { tool: "Read", path: "/elsewhere/spec.md" },
  { tool: "Glob", path: "/elsewhere" },
  { tool: "Write", path: "apps/loans-api/spec.md" },
  { tool: "Bash", path: undefined },
])("blocks the judge from $tool on $path", ({ tool, path }) => {
  const root = repoWithFiles(LAYOUT);

  expect(blockReasonOf(call(tool, path), root, ENV)).toMatch(/^The intent judge can't use /u);
});

test("blocks every call when the patterns aren't set", () => {
  const root = repoWithFiles({ "apps/loans-api/spec.md": "" });

  expect(blockReasonOf(call("Read", "apps/loans-api/spec.md"), root, {})).toBe(
    "The intent judge can't tell what any file is: SPEC_FILES, TEST_FILES, TEST_SUPPORT_FILES must be set in .claude/settings.json.",
  );
});
