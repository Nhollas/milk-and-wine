import { readFileSync } from "node:fs";
import { basename } from "node:path";

type HookInput = { tool_input?: { file_path?: string } };

const event = JSON.parse(readFileSync(0, "utf8")) as HookInput;
const path = event.tool_input?.file_path;

if (path !== undefined && basename(path) === "GLOSSARY.md") {
  process.stderr.write(
    "GLOSSARY.md is edited by people only. If a spec scenario or a conversation needs a word the glossary lacks, propose it when you hand work back.\n",
  );
  process.exitCode = 2;
}
