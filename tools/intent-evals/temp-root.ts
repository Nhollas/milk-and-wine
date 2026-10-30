import { mkdirSync, mkdtempDisposableSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { CASES_FOLDER } from "./cases.ts";
import { EXAMPLES_FOLDER } from "./examples.ts";

type SpecScenario = [id: string, then: string, verified?: string];

/** A repository root holding only examples and cases, for checking the tool without the real ones. */
export function createTempRoot() {
  const dir = mkdtempDisposableSync(join(tmpdir(), "intent-evals-root-"));
  const root = realpathSync(dir.path);

  function write(path: string, content: string) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }

  mkdirSync(join(root, CASES_FOLDER), { recursive: true });
  return {
    root,
    writeExample(
      example: string,
      files: { scenarios: SpecScenario[]; code: string; tests?: string },
    ) {
      const folder = `${EXAMPLES_FOLDER}/${example}`;
      write(`${folder}/specs/modules/${example}/spec.md`, specMarkdown(example, files.scenarios));
      write(`${folder}/src/${example}/${example}.ts`, files.code);
      if (files.tests !== undefined) {
        write(`${folder}/src/${example}/${example}.service.test.ts`, files.tests);
      }
    },
    writeCase(example: string, id: string, content: unknown) {
      const text = typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`;
      write(`${CASES_FOLDER}/${example}/${id}.json`, text);
    },
    [Symbol.dispose]() {
      dir.remove();
    },
  };
}

function specMarkdown(example: string, scenarios: SpecScenario[]): string {
  return [
    `# ${example}`,
    "",
    "| ID | Given | When | Then | Verified |",
    "| --- | --- | --- | --- | --- |",
    ...scenarios.map(
      ([id, then, verified = "service"]) =>
        `| ${id} | A widget exists | It is priced | ${then} | ${verified} |`,
    ),
    "",
  ].join("\n");
}
