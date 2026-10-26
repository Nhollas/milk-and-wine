import {
  copyFileSync,
  mkdirSync,
  mkdtempDisposableSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const REPO_ROOT = join(import.meta.dirname, "../..");

const VITEST_CONFIG = `import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [{ extends: true, test: { name: "service", include: ["src/**/*.service.test.ts"] } }],
  },
});
`;

export function createTempRepo() {
  const dir = mkdtempDisposableSync(join(tmpdir(), "spec-mutants-"));
  const root = realpathSync(dir.path);

  function write(path: string, content: string) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }

  for (const path of ["tsconfig.json", "tools/spec-mutants/src.tsconfig.json"]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    copyFileSync(join(REPO_ROOT, path), join(root, path));
  }
  symlinkSync(join(REPO_ROOT, "node_modules"), join(root, "node_modules"), "dir");
  write("package.json", `{ "type": "module" }\n`);
  write("vitest.config.ts", VITEST_CONFIG);

  return {
    root,
    writeSpec(subject: string, rows: SpecRow[]) {
      write(`specs/modules/${subject}/spec.md`, specMarkdown(subject, rows));
    },
    writeMutants(subject: string, mutants: unknown) {
      write(`specs/modules/${subject}/mutants.json`, `${JSON.stringify(mutants, null, 2)}\n`);
    },
    writeFile(path: string, content: string) {
      write(path, content);
    },
    readFile(path: string) {
      return readFileSync(join(root, path), "utf8");
    },
    [Symbol.dispose]() {
      dir.remove();
    },
  };
}

type SpecRow = [id: string, then: string];

function specMarkdown(subject: string, rows: SpecRow[]): string {
  return [
    `# ${subject}`,
    "",
    "| ID | Given | When | Then | Verified |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map(([id, then]) => `| ${id} | A widget exists | It is priced | ${then} | service |`),
    "",
  ].join("\n");
}
