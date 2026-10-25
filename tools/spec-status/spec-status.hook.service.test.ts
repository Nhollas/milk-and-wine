import { expect, test } from "vitest";
import { runHook } from "./hook.ts";
import { createTempRepo } from "./temp-repo.ts";

const WIDGETS_SPEC = "specs/modules/widgets/spec.md";
const WIDGETS_TESTS = "src/widgets/widgets.service.test.ts";

test("B11: adds a spec's status to Claude Code's context after reading it, and nothing for other files", async () => {
  using repo = createTempRepo();
  repo.writeSpec(WIDGETS_SPEC, [["B1", "service"]]);
  repo.writeTests(WIDGETS_TESTS, [{ title: "B1: is planned", modifier: "todo" }]);

  const specReadOutput = await runHook(
    JSON.stringify({
      tool_name: "Read",
      tool_input: { file_path: `${repo.root}/${WIDGETS_SPEC}` },
    }),
    repo.root,
  );
  const testReadOutput = await runHook(
    JSON.stringify({
      tool_name: "Read",
      tool_input: { file_path: `${repo.root}/${WIDGETS_TESTS}` },
    }),
    repo.root,
  );
  const specEditOutput = await runHook(
    JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: `${repo.root}/${WIDGETS_SPEC}` },
    }),
    repo.root,
  );

  const { hookSpecificOutput } = JSON.parse(specReadOutput) as {
    hookSpecificOutput: { hookEventName: string; additionalContext: string };
  };
  expect(hookSpecificOutput.hookEventName).toBe("PostToolUse");
  expect(hookSpecificOutput.additionalContext).toContain(
    "A proposed row describes behaviour that is not built yet",
  );
  expect(hookSpecificOutput.additionalContext).toContain(
    ` B1  service   proposed  todo in ${WIDGETS_TESTS}`,
  );
  expect(testReadOutput).toBe("");
  expect(specEditOutput).toBe("");
});

test("B12: adds nothing when the spec-mutator agent reads a spec", async () => {
  using repo = createTempRepo();
  repo.writeSpec(WIDGETS_SPEC, [["B1", "service"]]);
  repo.writeTests(WIDGETS_TESTS, [{ title: "B1: is planned", modifier: "todo" }]);

  const output = await runHook(
    JSON.stringify({
      tool_name: "Read",
      tool_input: { file_path: `${repo.root}/${WIDGETS_SPEC}` },
      agent_type: "spec-mutator",
    }),
    repo.root,
  );

  expect(output).toBe("");
});
