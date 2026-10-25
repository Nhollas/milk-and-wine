import { expect, test } from "vitest";
import { runCheck } from "./check.ts";
import { runStatus } from "./status.ts";
import { createTempRepo } from "./temp-repo.ts";

const WIDGETS_SPEC = "specs/modules/widgets/spec.md";
const WIDGETS_TESTS = "src/widgets/widgets.service.test.ts";

async function statusRows(root: string, subject = "widgets") {
  return JSON.parse((await runStatus([subject, "--json"], root)).output) as {
    id: string;
    verified: string;
    status: string;
    proof: string;
  }[];
}

test("B1: reads each row of a spec table as a row of the subject its folder names", async () => {
  using repo = createTempRepo();
  repo.writeSpec(WIDGETS_SPEC, [
    ["B1", "service", "Answers `a \\| b`"],
    ["B7", "`integration`"],
    ["B2", "dependency [Widget store](https://example.com/store)"],
  ]);

  const rows = await statusRows(repo.root);

  expect(rows).toMatchObject([
    { id: "B1", verified: "service" },
    { id: "B7", verified: "integration" },
    { id: "B2", verified: "dependency" },
  ]);
});

test("B2: attributes a test to a row by its file's subject and level, and ignores files without a level", async () => {
  using repo = createTempRepo();
  repo.writeSpec(WIDGETS_SPEC, [["B1", "service"]]);
  repo.writeTests("src/widgets/widgets.http.service.test.ts", [{ title: "B1: answers" }]);
  repo.writeTests("src/widgets/widgets.test.ts", [{ title: "parses a widget" }]);
  repo.writeTests("src/widgets/widget-parser.test.ts", [
    { title: "B9: not a row, but not a delivering level" },
  ]);

  expect(await statusRows(repo.root)).toEqual([
    {
      subject: "widgets",
      id: "B1",
      verified: "service",
      status: "delivered",
      proof: 'src/widgets/widgets.http.service.test.ts › "B1: answers"',
    },
  ]);
  expect((await runCheck([], repo.root)).exitCode).toBe(0);
});

test("B2: names a row from tests declared with test.each, a helper or inside a describe", async () => {
  using repo = createTempRepo();
  repo.writeSpec(WIDGETS_SPEC, [
    ["B1", "service"],
    ["B2", "service"],
    ["B3", "service"],
  ]);
  repo.writeFile(
    WIDGETS_TESTS,
    [
      `import { describe, test } from "vitest";`,
      `test.each([200, 204])("B1: accepts a %i", () => {});`,
      `const testThat = (title: string) => test(title, () => {});`,
      `testThat("B2: is built by a helper");`,
      `describe("B3: grouped", () => {`,
      `  test("is built", () => {});`,
      `});`,
    ].join("\n"),
  );

  const rows = await statusRows(repo.root);

  expect(rows).toMatchObject([
    { id: "B1", status: "delivered", proof: `${WIDGETS_TESTS} › "B1: accepts a 200"` },
    { id: "B2", status: "delivered", proof: `${WIDGETS_TESTS} › "B2: is built by a helper"` },
    { id: "B3", status: "delivered", proof: `${WIDGETS_TESTS} › "B3: grouped > is built"` },
  ]);
});

test("B3: delivers a row only through an active test at its Verified level", async () => {
  using repo = createTempRepo();
  repo.writeSpec(WIDGETS_SPEC, [
    ["B1", "service"],
    ["B2", "service"],
    ["B3", "service"],
    ["B4", "service"],
    ["B5", "service"],
  ]);
  repo.writeTests(WIDGETS_TESTS, [
    { title: "B1: is built" },
    { title: "B2: is planned", modifier: "todo" },
    { title: "B3: is parked", modifier: "skip" },
  ]);
  repo.writeTests("src/widgets/widgets.integration.test.ts", [
    { title: "B4: is tested at the wrong level" },
  ]);

  const rows = await statusRows(repo.root);

  expect(rows).toMatchObject([
    { id: "B1", status: "delivered", proof: `${WIDGETS_TESTS} › "B1: is built"` },
    { id: "B2", status: "proposed", proof: `todo in ${WIDGETS_TESTS}` },
    { id: "B3", status: "proposed", proof: `skipped in ${WIDGETS_TESTS}` },
    {
      id: "B4",
      status: "proposed",
      proof: "wrong level: integration in src/widgets/widgets.integration.test.ts",
    },
    { id: "B5", status: "proposed", proof: "nothing yet" },
  ]);
});

test("B4: delivers a dependency row and lists a manual row for sign-off, with the link as proof", async () => {
  using repo = createTempRepo();
  repo.writeSpec(WIDGETS_SPEC, [
    ["B1", "dependency [Widget store](https://example.com/store)"],
    ["B2", "manual [runbook](../../../docs/runbooks/widgets.md)"],
  ]);

  const rows = await statusRows(repo.root);

  expect(rows).toMatchObject([
    { id: "B1", status: "delivered", proof: "https://example.com/store" },
    { id: "B2", status: "sign-off", proof: "docs/runbooks/widgets.md" },
  ]);
});

test("B5: prints each row's status for one subject or every subject, as text or JSON", async () => {
  using repo = createTempRepo();
  repo.writeSpec(WIDGETS_SPEC, [
    ["B1", "service"],
    ["B2", "service"],
  ]);
  repo.writeSpec("specs/journeys/use-a-widget/spec.md", [["B1", "system"]]);
  repo.writeTests(WIDGETS_TESTS, [{ title: "B1: is built" }]);

  const oneSubject = await runStatus(["widgets"], repo.root);
  const everySubject = await runStatus([], repo.root);
  const asJson = await statusRows(repo.root, "use-a-widget");

  expect(oneSubject).toEqual({
    exitCode: 0,
    output: [
      "widgets · 1 delivered · 1 proposed · 0 sign-off",
      "",
      " ID  Verified  Status     Proof",
      ` B1  service   delivered  ${WIDGETS_TESTS} › "B1: is built"`,
      " B2  service   proposed   nothing yet",
      "",
    ].join("\n"),
  });
  expect(everySubject.output).toContain("use-a-widget · 0 delivered · 1 proposed");
  expect(everySubject.output).toContain("widgets · 1 delivered · 1 proposed");
  expect(asJson).toEqual([
    {
      subject: "use-a-widget",
      id: "B1",
      verified: "system",
      status: "proposed",
      proof: "nothing yet",
    },
  ]);
});

test("B6: refuses a subject no spec folder is named after", async () => {
  using repo = createTempRepo();
  repo.writeSpec(WIDGETS_SPEC, [["B1", "service"]]);

  expect(await runStatus(["gadgets"], repo.root)).toEqual({
    exitCode: 1,
    output: "unknown subject: gadgets\n",
  });
});
