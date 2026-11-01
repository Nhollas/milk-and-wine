import { cpSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Edit } from "./case-files.ts";
import { exampleFolder, plant } from "./example-workspace.ts";

/** Fills an empty workspace with a case's example, plant applied: `node stage-case.ts <case id> <workspace>`. */
const [caseId, workspace] = process.argv.slice(2) as [string, string];
const root = join(import.meta.dirname, "../../../../..");
const evalCase = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", caseId, "plant.json"), "utf8"),
) as {
  example: string;
  plant?: Edit[];
};
cpSync(exampleFolder(root, evalCase.example), workspace, { recursive: true });
plant(workspace, evalCase.plant ?? []);
