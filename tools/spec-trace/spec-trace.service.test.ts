import { expect, test } from "vitest";
import { runCheck } from "./check.ts";
import { runHook } from "./hook.ts";
import { runStatus } from "./status.ts";
import { commitAll, fixtureRepository, specFile, testFile, writeFiles } from "./fixtures.ts";

const WIDGETS_SPEC = "specs/modules/widgets/spec.md";
const WIDGETS_TESTS = "src/widgets/widgets.service.test.ts";

function statusRows(root: string, subject = "widgets") {
  return JSON.parse(runStatus([subject, "--json"], root).output) as { id: string; verified: string; status: string; proof: string }[];
}

test("B1: reads each row of a spec table as a row of the subject its folder names", () => {
  const root = fixtureRepository({
    [WIDGETS_SPEC]: specFile([
      ["B1", "service", "Answers `a \\| b`"],
      ["B7", "`boundary`"],
      ["B2", "dependency [Widget store](https://example.com/store)"],
    ]),
  });

  expect(statusRows(root).map(({ id, verified }) => ({ id, verified }))).toEqual([
    { id: "B1", verified: "service" },
    { id: "B7", verified: "boundary" },
    { id: "B2", verified: "dependency" },
  ]);
});

test("B2: attributes a test to a row by its file's subject and level, and ignores files without a level", () => {
  const root = fixtureRepository({
    [WIDGETS_SPEC]: specFile([["B1", "service"]]),
    "src/widgets/widgets.http.service.test.ts": testFile([{ title: "B1: answers" }]),
    "src/widgets/widgets.test.ts": testFile([{ title: "parses a widget" }]),
    "src/widgets/widget-parser.test.ts": testFile([{ title: "B9: not a row, but not a delivering level" }]),
  });

  expect(statusRows(root)).toEqual([
    {
      subject: "widgets",
      id: "B1",
      verified: "service",
      status: "delivered",
      proof: 'src/widgets/widgets.http.service.test.ts › "B1: answers"',
    },
  ]);
  expect(runCheck([], root).exitCode).toBe(0);
});

test("B3: delivers a row only through an active test at its Verified level", () => {
  const root = fixtureRepository({
    [WIDGETS_SPEC]: specFile([
      ["B1", "service"],
      ["B2", "service"],
      ["B3", "service"],
      ["B4", "service"],
      ["B5", "service"],
    ]),
    [WIDGETS_TESTS]: testFile([
      { title: "B1: is built" },
      { title: "B2: is planned", modifier: "todo" },
      { title: "B3: is parked", modifier: "skip" },
    ]),
    "src/widgets/widgets.boundary.test.ts": testFile([{ title: "B4: is tested at the wrong level" }]),
  });

  expect(statusRows(root).map(({ id, status, proof }) => `${id} ${status} ${proof}`)).toEqual([
    `B1 delivered ${WIDGETS_TESTS} › "B1: is built"`,
    `B2 proposed todo in ${WIDGETS_TESTS}`,
    `B3 proposed skipped in ${WIDGETS_TESTS}`,
    "B4 proposed wrong level: boundary in src/widgets/widgets.boundary.test.ts",
    "B5 proposed nothing yet",
  ]);
});

test("B4: delivers a dependency row and lists a manual row for sign-off, with the link as proof", () => {
  const root = fixtureRepository({
    [WIDGETS_SPEC]: specFile([
      ["B1", "dependency [Widget store](https://example.com/store)"],
      ["B2", "manual [runbook](../../../docs/runbooks/widgets.md)"],
    ]),
  });

  expect(statusRows(root).map(({ id, status, proof }) => `${id} ${status} ${proof}`)).toEqual([
    "B1 delivered https://example.com/store",
    "B2 sign-off docs/runbooks/widgets.md",
  ]);
});

test("B5: prints each row's status for one subject or every subject, as text or JSON", () => {
  const root = fixtureRepository({
    [WIDGETS_SPEC]: specFile([
      ["B1", "service"],
      ["B2", "service"],
    ]),
    "specs/journeys/use-a-widget/spec.md": specFile([["B1", "system"]]),
    [WIDGETS_TESTS]: testFile([{ title: "B1: is built" }]),
  });

  expect(runStatus(["widgets"], root)).toEqual({
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
  expect(runStatus([], root).output).toContain("use-a-widget · 0 delivered · 1 proposed");
  expect(runStatus([], root).output).toContain("widgets · 1 delivered · 1 proposed");
  expect(statusRows(root, "use-a-widget")).toEqual([
    { subject: "use-a-widget", id: "B1", verified: "system", status: "proposed", proof: "nothing yet" },
  ]);
});

test("B6: refuses a subject no spec folder is named after", () => {
  const root = fixtureRepository({ [WIDGETS_SPEC]: specFile([["B1", "service"]]) });

  expect(runStatus(["gadgets"], root)).toEqual({ exitCode: 1, output: "unknown subject: gadgets\n" });
});

test("B7: fails on a repeated ID or a Verified value it doesn't recognise", () => {
  const root = fixtureRepository({
    [WIDGETS_SPEC]: specFile([
      ["B1", "service"],
      ["B1", "service"],
      ["B2", "unit"],
    ]),
  });

  const { exitCode, output } = runCheck([], root);

  expect(exitCode).toBe(1);
  expect(output).toContain(`duplicate-id      ${WIDGETS_SPEC}:10  B1 appears more than once in widgets`);
  expect(output).toContain(`invalid-verified  ${WIDGETS_SPEC}:11  B2 has Verified "unit"`);
});

test("B8: fails on a test naming an unknown row or subject, or naming no row", () => {
  const root = fixtureRepository({
    [WIDGETS_SPEC]: specFile([["B1", "service"]]),
    [WIDGETS_TESTS]: testFile([{ title: "B1: is built" }, { title: "B9: is not specified" }, { title: "does something" }]),
    "src/gadgets/gadgets.service.test.ts": testFile([{ title: "B1: has no spec" }]),
  });

  const { exitCode, output } = runCheck([], root);

  expect(exitCode).toBe(1);
  expect(output).toContain("unknown-subject  src/gadgets/gadgets.service.test.ts:3  no spec folder is named gadgets");
  expect(output).toContain(`unknown-id       ${WIDGETS_TESTS}:4  B9 is not a row of widgets`);
  expect(output).toContain(`untagged-test    ${WIDGETS_TESTS}:5  "does something" names no row of widgets`);
});

test("B9: passes with proposed rows and reports how many rows are in each status", () => {
  const root = fixtureRepository({
    [WIDGETS_SPEC]: specFile([
      ["B1", "service"],
      ["B2", "service"],
      ["B3", "manual [runbook](runbook.md)"],
    ]),
    [WIDGETS_TESTS]: testFile([{ title: "B1: is built" }, { title: "B2: is planned", modifier: "todo" }]),
  });

  expect(runCheck([], root)).toEqual({
    exitCode: 0,
    output: "spec:check passed · 1 delivered · 1 proposed · 1 sign-off\n",
  });
});

test("B10: fails when a row delivered on the base revision is proposed now, but not when it was deleted", () => {
  const root = fixtureRepository({
    [WIDGETS_SPEC]: specFile([
      ["B1", "service"],
      ["B2", "service"],
    ]),
    [WIDGETS_TESTS]: testFile([{ title: "B1: is built" }, { title: "B2: is built" }]),
  });
  commitAll(root, "deliver widgets");
  writeFiles(root, {
    [WIDGETS_SPEC]: specFile([["B1", "service"]]),
    [WIDGETS_TESTS]: testFile([{ title: "B1: is unfinished", modifier: "todo" }]),
  });

  const { exitCode, output } = runCheck(["--base", "main"], root);

  expect(exitCode).toBe(1);
  expect(output).toContain("regression  widgets B1  B1 of widgets was delivered on the base revision and is proposed now");
  expect(output).not.toContain("widgets B2");
});

test("B11: adds a spec's status to Claude Code's context after reading it, and nothing for other files", () => {
  const root = fixtureRepository({
    [WIDGETS_SPEC]: specFile([["B1", "service"]]),
    [WIDGETS_TESTS]: testFile([{ title: "B1: is planned", modifier: "todo" }]),
  });
  const read = (filePath: string) => runHook(JSON.stringify({ tool_name: "Read", tool_input: { file_path: filePath } }), root);

  const output = JSON.parse(read(`${root}/${WIDGETS_SPEC}`)) as {
    hookSpecificOutput: { hookEventName: string; additionalContext: string };
  };

  expect(output.hookSpecificOutput.hookEventName).toBe("PostToolUse");
  expect(output.hookSpecificOutput.additionalContext).toContain("A proposed row describes behaviour that is not built yet");
  expect(output.hookSpecificOutput.additionalContext).toContain(` B1  service   proposed  todo in ${WIDGETS_TESTS}`);
  expect(read(`${root}/${WIDGETS_TESTS}`)).toBe("");
  expect(runHook(JSON.stringify({ tool_name: "Edit", tool_input: { file_path: `${root}/${WIDGETS_SPEC}` } }), root)).toBe("");
});
