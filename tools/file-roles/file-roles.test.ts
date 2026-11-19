import { expect, test } from "vitest";
import { repoWithFiles } from "../repo-with-files.ts";
import { readFileRoles, repoPathOf, roleOf, type FileRoles } from "./file-roles.ts";

const ROLES: FileRoles = {
  specs: "**/spec.md",
  tests: "**/*.test.ts",
  testSupport: "{src/tests/**,**/*.fixtures.ts}",
};

test.each([
  { path: "specs/modules/loans/spec.md", role: "spec" },
  { path: "apps/loans-api/spec.md", role: "spec" },
  { path: "specs/modules/loans/mutants.json", role: "mutants" },
  { path: "src/loans/loans.test.ts", role: "test" },
  { path: "src/tests/system/borrow-a-book.system.test.ts", role: "test" },
  { path: "src/tests/support/fake-catalogue-client.ts", role: "test-support" },
  { path: "src/loans/loans.fixtures.ts", role: "test-support" },
  { path: "src/loans/loans-app.ts", role: "code" },
  { path: "README.md", role: "code" },
])("names $path as $role", ({ path, role }) => {
  const root = repoWithFiles({
    "specs/modules/loans/spec.md": "",
    "specs/modules/loans/mutants.json": "{}",
    "apps/loans-api/spec.md": "",
  });

  expect(roleOf(path, ROLES, root)).toBe(role);
});

test("names a mutants.json with no spec beside it as code", () => {
  const root = repoWithFiles({ "src/loans/mutants.json": "{}" });

  expect(roleOf("src/loans/mutants.json", ROLES, root)).toBe("code");
});

test("reads the patterns from SPEC_FILES, TEST_FILES and TEST_SUPPORT_FILES", () => {
  const env = {
    SPEC_FILES: "docs/**/behaviour.md",
    TEST_FILES: "**/test_*.py",
    TEST_SUPPORT_FILES: "**/conftest.py",
  };

  expect(readFileRoles(env)).toEqual({
    specs: "docs/**/behaviour.md",
    tests: "**/test_*.py",
    testSupport: "**/conftest.py",
  });
});

test("names every pattern that isn't set", () => {
  const env = { TEST_FILES: "**/*.test.ts", TEST_SUPPORT_FILES: "" };

  expect(readFileRoles(env)).toBe(
    "SPEC_FILES, TEST_SUPPORT_FILES must be set in .claude/settings.json",
  );
});

test.each([
  { toolPath: "/repo/src/loans/loans-app.ts", path: "src/loans/loans-app.ts" },
  { toolPath: "src/loans/loans-app.ts", path: "src/loans/loans-app.ts" },
  { toolPath: "/repo", path: "" },
  { toolPath: "/elsewhere/secrets.ts", path: undefined },
  { toolPath: "../secrets.ts", path: undefined },
])("finds $toolPath at $path in the repository", ({ toolPath, path }) => {
  expect(repoPathOf(toolPath, "/repo")).toBe(path);
});
