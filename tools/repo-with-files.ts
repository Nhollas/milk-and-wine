import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { onTestFinished } from "vitest";

/** A temporary repository holding `files`, removed when the test finishes. Returns its root. */
export function repoWithFiles(files: Record<string, string>): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "repo-")));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}
