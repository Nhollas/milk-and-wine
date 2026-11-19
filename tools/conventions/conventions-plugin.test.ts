import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuleTester } from "oxlint/plugins-dev";
import { afterAll, describe, test } from "vitest";
import plugin from "./conventions-plugin.ts";

RuleTester.describe = describe as RuleTester.DescribeFn;
RuleTester.it = test;

const repo = mkdtempSync(join(tmpdir(), "conventions-"));
mkdirSync(join(repo, "src", "loans"), { recursive: true });
mkdirSync(join(repo, "src", "apps", "loans-api"), { recursive: true });
afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

const ruleTester = new RuleTester({ cwd: repo });

const at = (path: string) => join(repo, path);

ruleTester.run("max-comment-lines", plugin.rules["max-comment-lines"], {
  valid: [
    "// add 14 days\nconst dueOn = 1;",
    "// The catalogue retries,\n// so this stays idempotent.\nconst id = 1;",
    "/**\n * Two lines of\n * explanation.\n */\nconst id = 1;",
    "// one\nconst a = 1;\n// two\n// three\nconst b = 2;",
    'const url = "https://catalogue.example";',
  ],
  invalid: [
    { code: "// one\n// two\n// three\nconst id = 1;", errors: 1 },
    { code: "/* one\n   two\n   three */\nconst id = 1;", errors: 1 },
    { code: "/**\n * one\n * two\n * three\n */\nconst id = 1;", errors: 1 },
  ],
});

ruleTester.run("file-names", plugin.rules["file-names"], {
  valid: [
    { code: "", filename: at("src/loans/loan-store.ts") },
    { code: "", filename: at("tests/support/http-interceptor.setup.ts") },
    { code: "", filename: at("tests/support/unit.fixtures.ts") },
    { code: "", filename: at("tests/support/catalogue-api.handlers.ts") },
    { code: "", filename: at("tests/support/fake-catalogue-client.ts") },
    { code: "", filename: at("src/loans/loans.http.test.ts") },
  ],
  invalid: [
    { code: "", filename: at("tests/support/helpers.ts"), errors: 1 },
    { code: "", filename: at("tests/system/fixtures.ts"), errors: 1 },
    { code: "", filename: at("tests/support/catalogue.mocks.ts"), errors: 1 },
    { code: "", filename: at("tests/support/catalogue.handlers.ts"), errors: 1 },
    { code: "", filename: at("tests/support/fake-catalogue.ts"), errors: 1 },
  ],
});

ruleTester.run("test-placement", plugin.rules["test-placement"], {
  valid: [
    { code: "", filename: at("src/loans/loans.test.ts") },
    { code: "", filename: at("tests/system/borrow-a-book.system.test.ts") },
    { code: "", filename: at("src/clock.test.ts") },
    { code: "", filename: at("src/reminders/reminders.failures.test.ts") },
    { code: "", filename: at("src/apps/loans-api/loans-api.integration.test.ts") },
  ],
  invalid: [
    { code: "", filename: at("tests/unit/loans.test.ts"), errors: 1 },
    { code: "", filename: at("src/reminders/loans.test.ts"), errors: 1 },
    { code: "", filename: at("tests/integration/borrow-a-book.system.test.ts"), errors: 1 },
    { code: "", filename: at("src/loans/borrow-a-book.system.test.ts"), errors: 1 },
    { code: "", filename: at("tests/integration/loans-api.integration.test.ts"), errors: 1 },
  ],
});

ruleTester.run("helper-placement", plugin.rules["helper-placement"], {
  valid: [
    {
      code: 'import { test } from "../../tests/support/unit.fixtures.ts";',
      filename: at("src/loans/loans.test.ts"),
    },
    {
      code: 'import { test } from "./system.fixtures.ts";',
      filename: at("tests/system/borrow-a-book.system.test.ts"),
    },
    {
      code: 'import { createLoansApp } from "../../src/loans/loans-app.ts";',
      filename: at("tests/support/unit.fixtures.ts"),
    },
  ],
  invalid: [
    {
      code: 'import { test } from "../../tests/system/system.fixtures.ts";',
      filename: at("src/loans/loans.test.ts"),
      errors: 1,
    },
    {
      code: 'import { fakeCatalogueClient } from "../loans/fake-catalogue-client.ts";',
      filename: at("src/reminders/reminders.test.ts"),
      errors: 1,
    },
  ],
});

ruleTester.run("interceptor-use-placement", plugin.rules["interceptor-use-placement"], {
  valid: [
    { code: "httpInterceptor.use(handler);", filename: at("tests/system/a.system.test.ts") },
    { code: "httpInterceptor.use(handler);", filename: at("tests/support/x.setup.ts") },
  ],
  invalid: [
    {
      code: "export function copyLookupHandler() { httpInterceptor.use(handler); }",
      filename: at("tests/support/catalogue-api.handlers.ts"),
      errors: 1,
    },
  ],
});

ruleTester.run("support-modules", plugin.rules["support-modules"], {
  valid: [
    {
      code: 'import { test as base } from "vitest";\nexport const test = base;',
      filename: at("tests/support/unit.fixtures.ts"),
    },
    {
      code: 'import { http } from "msw";',
      filename: at("tests/support/catalogue-api.handlers.ts"),
    },
    {
      code: 'import { http } from "msw";',
      filename: at("src/catalogue/catalogue.integration.test.ts"),
    },
  ],
  invalid: [
    {
      code: 'import { test as base } from "vitest";\nexport const test = base;',
      filename: at("tests/support/test-clock.ts"),
      errors: 1,
    },
    { code: 'import { http } from "msw";', filename: at("tests/support/test-clock.ts"), errors: 1 },
    {
      code: "export const test = base;\nexport const CATALOGUE_URL = '';",
      filename: at("tests/system/system.fixtures.ts"),
      errors: 1,
    },
  ],
});

ruleTester.run("test-imports", plugin.rules["test-imports"], {
  valid: [
    { code: 'import { expect, test } from "vitest";', filename: at("src/clock.test.ts") },
    {
      code: 'import { test } from "./repo.fixtures.ts";',
      filename: at("tools/spec-mutants/spec-mutants.test.ts"),
    },
    {
      code: 'import { test as base } from "vitest";',
      filename: at("tests/system/system.fixtures.ts"),
    },
  ],
  invalid: [
    {
      code: 'import { test as unitTest } from "../../tests/support/unit.fixtures.ts";',
      filename: at("src/loans/loans.test.ts"),
      errors: 1,
    },
    {
      code: 'import { test } from "../../tests/support/test-clock.ts";',
      filename: at("src/loans/loans.test.ts"),
      errors: 1,
    },
    {
      code: 'import { it as test } from "vitest";',
      filename: at("src/clock.test.ts"),
      errors: 1,
    },
  ],
});
