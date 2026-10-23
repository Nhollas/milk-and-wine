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
afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

const ruleTester = new RuleTester({ cwd: repo });

const at = (path: string) => join(repo, path);

ruleTester.run("no-comments", plugin.rules["no-comments"], {
  valid: [
    "const dueOn = addDays(lentOn, 14);",
    "// See specs/modules/loans/spec.md B8\nconst renewals = 2;",
    "// docs/adr/0004-expected-outcomes-are-return-values.md\nconst outcome = 1;",
    "// oxlint-disable-next-line no-console\nconsole.log(1);",
    'const url = "https://catalogue.example";',
  ],
  invalid: [
    { code: "// add 14 days\nconst dueOn = 1;", errors: 1 },
    { code: "const dueOn = 1; /* days */", errors: 1 },
  ],
});

ruleTester.run("no-reserved-words", plugin.rules["no-reserved-words"], {
  valid: ['const level = "service";', "function createLoansApp() {}"],
  invalid: [
    { code: "function loanService() {}", errors: 1 },
    { code: "type ServiceOptions = {};", filename: at("src/loans/loans-app.ts"), errors: 1 },
  ],
});

ruleTester.run("file-names", plugin.rules["file-names"], {
  valid: [
    { code: "", filename: at("src/loans/loan-store.ts") },
    { code: "", filename: at("tests/support/http-interceptor.setup.ts") },
    { code: "", filename: at("tests/support/service.fixtures.ts") },
    { code: "", filename: at("tests/support/catalogue-api.handlers.ts") },
    { code: "", filename: at("tests/support/fake-catalogue-client.ts") },
    { code: "", filename: at("src/loans/loans.http.service.test.ts") },
  ],
  invalid: [
    { code: "", filename: at("tests/support/helpers.ts"), errors: 1 },
    { code: "", filename: at("tests/system/fixtures.ts"), errors: 1 },
    { code: "", filename: at("tests/support/library.mocks.ts"), errors: 1 },
    { code: "", filename: at("tests/support/catalogue.handlers.ts"), errors: 1 },
    { code: "", filename: at("tests/support/vitest.setup.ts"), errors: 1 },
    { code: "", filename: at("tests/support/fake-catalogue.ts"), errors: 1 },
  ],
});

ruleTester.run("client-names", plugin.rules["client-names"], {
  valid: [
    {
      code: "export type CatalogueClient = {};\nexport function createCatalogueClient() {}",
      filename: at("src/catalogue/catalogue-client.ts"),
    },
    {
      code: "export function fakeNotificationsClient() {}",
      filename: at("tests/support/fake-notifications-client.ts"),
    },
    { code: "export function openLibrary() {}", filename: at("tests/support/library.ts") },
  ],
  invalid: [
    {
      code: "export type CatalogueClient = {};\nexport function makeClient() {}",
      filename: at("src/catalogue/catalogue-client.ts"),
      errors: 1,
    },
    {
      code: "export function catalogueFake() {}",
      filename: at("tests/support/fake-catalogue-client.ts"),
      errors: 1,
    },
    {
      code: "export function createCatalogueClient() {}",
      filename: at("src/loans/loans-app.ts"),
      errors: 1,
    },
  ],
});

ruleTester.run("test-placement", plugin.rules["test-placement"], {
  valid: [
    { code: "", filename: at("src/loans/loans.service.test.ts") },
    { code: "", filename: at("tests/system/borrow-a-book.system.test.ts") },
    { code: "", filename: at("src/clock.test.ts") },
  ],
  invalid: [
    { code: "", filename: at("tests/service/loans.service.test.ts"), errors: 1 },
    { code: "", filename: at("tests/smoke/borrow-a-book.system.test.ts"), errors: 1 },
    { code: "", filename: at("src/loans/borrow-a-book.system.test.ts"), errors: 1 },
  ],
});

ruleTester.run("helper-placement", plugin.rules["helper-placement"], {
  valid: [
    {
      code: 'import { test } from "../../tests/support/service.fixtures.ts";',
      filename: at("src/loans/loans.service.test.ts"),
    },
    {
      code: 'import { test } from "./system.fixtures.ts";',
      filename: at("tests/system/borrow-a-book.system.test.ts"),
    },
    {
      code: 'import { createLoansApp } from "../../src/loans/loans-app.ts";',
      filename: at("tests/support/library.ts"),
    },
  ],
  invalid: [
    {
      code: 'import { test } from "../../tests/system/system.fixtures.ts";',
      filename: at("src/loans/loans.service.test.ts"),
      errors: 1,
    },
    {
      code: 'import { fakeCatalogueClient } from "../loans/fake-catalogue-client.ts";',
      filename: at("src/reminders/reminders.service.test.ts"),
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

ruleTester.run("no-sql-in-tests", plugin.rules["no-sql-in-tests"], {
  valid: [
    {
      code: 'test("B1: deletes nothing", () => {});',
      filename: at("src/loans/loans.service.test.ts"),
    },
    { code: 'db.prepare("SELECT 1");', filename: at("tests/support/library.ts") },
  ],
  invalid: [
    {
      code: 'db.prepare("SELECT COUNT(*) FROM loans");',
      filename: at("src/loans/loans.service.test.ts"),
      errors: 1,
    },
    {
      code: "db.exec(`DELETE FROM loans`);",
      filename: at("tests/system/system.fixtures.ts"),
      errors: 1,
    },
  ],
});

ruleTester.run("urls-in-handlers", plugin.rules["urls-in-handlers"], {
  valid: [
    {
      code: 'export const CATALOGUE_URL = "http://catalogue.test";',
      filename: at("tests/support/catalogue-api.handlers.ts"),
    },
    {
      code: "const url = new URL(path, process.env.CATALOGUE_URL);",
      filename: at("src/catalogue/catalogue-client.ts"),
    },
  ],
  invalid: [
    {
      code: 'const client = createCatalogueClient("http://catalogue.test");',
      filename: at("src/catalogue/catalogue.integration.test.ts"),
      errors: 1,
    },
    {
      code: 'const base = "https://catalogue.example";',
      filename: at("src/catalogue/catalogue-client.ts"),
      errors: 1,
    },
  ],
});

ruleTester.run("support-modules", plugin.rules["support-modules"], {
  valid: [
    {
      code: 'import { test as base } from "vitest";\nexport const test = base;',
      filename: at("tests/support/service.fixtures.ts"),
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
      filename: at("tests/support/library.ts"),
      errors: 1,
    },
    { code: 'import { http } from "msw";', filename: at("tests/support/library.ts"), errors: 1 },
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
      filename: at("tools/spec-trace/spec-trace.service.test.ts"),
    },
    {
      code: 'import { test as base } from "vitest";',
      filename: at("tests/system/system.fixtures.ts"),
    },
  ],
  invalid: [
    {
      code: 'import { test as serviceTest } from "../../tests/support/service.fixtures.ts";',
      filename: at("src/loans/loans.service.test.ts"),
      errors: 1,
    },
    {
      code: 'import { test } from "../../tests/support/library.ts";',
      filename: at("src/loans/loans.service.test.ts"),
      errors: 1,
    },
    {
      code: 'import { it as test } from "vitest";',
      filename: at("src/clock.test.ts"),
      errors: 1,
    },
  ],
});
