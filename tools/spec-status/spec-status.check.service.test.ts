import { expect, test } from "vitest";
import { runCheck } from "./check.ts";
import { createTempRepo } from "./temp-repo.ts";

const WIDGETS_SPEC = "specs/modules/widgets/spec.md";
const WIDGETS_TESTS = "src/widgets/widgets.service.test.ts";

test("B7: fails on a repeated ID or a Verified value it doesn't recognise", async () => {
  using repo = createTempRepo();
  repo.writeSpec(WIDGETS_SPEC, [
    ["B1", "service"],
    ["B1", "service"],
    ["B2", "unit"],
  ]);

  const { exitCode, output } = await runCheck([], repo.root);

  expect(exitCode).toBe(1);
  expect(output).toContain(
    `duplicate-id      ${WIDGETS_SPEC}:10  B1 appears more than once in widgets`,
  );
  expect(output).toContain(`invalid-verified  ${WIDGETS_SPEC}:11  B2 has Verified "unit"`);
});

test("B8: fails on a test naming an unknown row or subject, or naming no row", async () => {
  using repo = createTempRepo();
  repo.writeSpec(WIDGETS_SPEC, [["B1", "service"]]);
  repo.writeTests(WIDGETS_TESTS, [
    { title: "B1: is built" },
    { title: "B9: is not specified" },
    { title: "does something" },
  ]);
  repo.writeTests("src/gadgets/gadgets.service.test.ts", [{ title: "B1: has no spec" }]);

  const { exitCode, output } = await runCheck([], repo.root);

  expect(exitCode).toBe(1);
  expect(output).toContain(
    "unknown-subject  src/gadgets/gadgets.service.test.ts:3  no spec folder is named gadgets",
  );
  expect(output).toContain(`unknown-id       ${WIDGETS_TESTS}:4  B9 is not a row of widgets`);
  expect(output).toContain(
    `untagged-test    ${WIDGETS_TESTS}:5  "does something" names no row of widgets`,
  );
});

test("B9: passes with proposed rows and reports how many rows are in each status", async () => {
  using repo = createTempRepo();
  repo.writeSpec(WIDGETS_SPEC, [
    ["B1", "service"],
    ["B2", "service"],
    ["B3", "manual [runbook](runbook.md)"],
  ]);
  repo.writeTests(WIDGETS_TESTS, [
    { title: "B1: is built" },
    { title: "B2: is planned", modifier: "todo" },
  ]);

  expect(await runCheck([], repo.root)).toEqual({
    exitCode: 0,
    output: "spec:check passed · 1 delivered · 1 proposed · 1 sign-off\n",
  });
});

test("B10: fails when a row delivered on the base revision is proposed now, but not when it was deleted", async () => {
  using repo = createTempRepo();
  repo.writeSpec(WIDGETS_SPEC, [
    ["B1", "service"],
    ["B2", "service"],
  ]);
  repo.writeTests(WIDGETS_TESTS, [{ title: "B1: is built" }, { title: "B2: is built" }]);
  repo.commit("deliver widgets");
  repo.writeSpec(WIDGETS_SPEC, [["B1", "service"]]);
  repo.writeTests(WIDGETS_TESTS, [{ title: "B1: is unfinished", modifier: "todo" }]);

  const { exitCode, output } = await runCheck(["--base", "main"], repo.root);

  expect(exitCode).toBe(1);
  expect(output).toContain(
    "regression  widgets B1  B1 of widgets was delivered on the base revision and is proposed now",
  );
  expect(output).not.toContain("widgets B2");
});

test("B13: fails on a test file that throws while it is collected", async () => {
  using repo = createTempRepo();
  repo.writeSpec(WIDGETS_SPEC, [["B1", "service"]]);
  repo.writeFile(WIDGETS_TESTS, `throw new Error("widget store is not configured");`);

  const { exitCode, output } = await runCheck([], repo.root);

  expect(exitCode).toBe(1);
  expect(output).toContain(`collect-error  ${WIDGETS_TESTS}  widget store is not configured`);
});
