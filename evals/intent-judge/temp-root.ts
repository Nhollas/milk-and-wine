import { mkdirSync, mkdtempDisposableSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { EVALS_FOLDER, FIXTURES_FOLDER } from "./workspace.ts";

type SpecScenario = [id: string, then: string, verified?: string];

type FixtureFiles = { scenarios: SpecScenario[]; code: string; tests?: string };

/** What a task holds besides its README: any file left out isn't written. */
type TaskFiles = {
  taskToml?: string;
  expected?: unknown;
  /** The environment's files, by path inside it. */
  environment?: Record<string, string>;
  /** The bug's files, by path inside it. */
  bug?: Record<string, string>;
};

/** A repository root holding only fixtures and tasks, for checking the tools without the real ones. */
export function createTempRoot() {
  const dir = mkdtempDisposableSync(join(tmpdir(), "intent-evals-root-"));
  const root = realpathSync(dir.path);

  function write(path: string, content: string) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }

  mkdirSync(join(root, EVALS_FOLDER), { recursive: true });
  return {
    root,
    writeFixture(fixture: string, files: FixtureFiles) {
      const folder = `${FIXTURES_FOLDER}/${fixture}`;
      write(`${folder}/specs/modules/${fixture}/spec.md`, specMarkdown(fixture, files.scenarios));
      write(`${folder}/src/${fixture}/${fixture}.ts`, files.code);
      if (files.tests !== undefined) {
        write(`${folder}/src/${fixture}/${fixture}.test.ts`, files.tests);
      }
    },
    /** A task folder: its README, titled with its id unless `readme` says otherwise, and its files. */
    writeTask(id: string, files: TaskFiles, readme = `# ${id}\n`) {
      const folder = `${EVALS_FOLDER}/${id}`;
      write(`${folder}/README.md`, readme);
      if (files.taskToml !== undefined) write(`${folder}/task.toml`, files.taskToml);
      if (files.expected !== undefined) {
        const text =
          typeof files.expected === "string"
            ? files.expected
            : `${JSON.stringify(files.expected, null, 2)}\n`;
        write(`${folder}/tests/expected.json`, text);
      }
      for (const [path, content] of Object.entries(files.environment ?? {})) {
        write(`${folder}/environment/${path}`, content);
      }
      for (const [path, content] of Object.entries(files.bug ?? {})) {
        write(`${folder}/bug/${path}`, content);
      }
    },
    /** A file at `path` under the root, such as a Harbor trial's result. */
    write,
    [Symbol.dispose]() {
      dir.remove();
    },
  };
}

/** The spec a fixture written by `writeFixture` has, for a task's environment to copy. */
export function specMarkdown(fixture: string, scenarios: SpecScenario[]): string {
  return [
    `# ${fixture}`,
    "",
    "| ID | Given | When | Then | Verified |",
    "| --- | --- | --- | --- | --- |",
    ...scenarios.map(
      ([id, then, verified = "unit"]) =>
        `| ${id} | A widget exists | It is priced | ${then} | ${verified} |`,
    ),
    "",
  ].join("\n");
}
