import { realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { mergeConfig, type Plugin, type ViteUserConfig } from "vitest/config";
import { mutant, plant, type Mutant } from "./mutants.ts";

// Replays a row's tests with one mutant applied as its module loads, so src/ never changes on disk.
const root = realpathSync(process.env["SPEC_MUTANTS_ROOT"] ?? process.cwd());
const plantedMutant = process.env["SPEC_MUTANT"]
  ? mutant.parse(JSON.parse(process.env["SPEC_MUTANT"]))
  : undefined;

function plantMutant(planted: Mutant): Plugin {
  const path = join(root, planted.file);
  return {
    name: "spec-mutants:plant",
    enforce: "pre",
    transform(code, id) {
      return id.split("?")[0] === path ? plant(planted, code) : undefined;
    },
  };
}

const rootConfig = (await import(pathToFileURL(join(root, "vitest.config.ts")).href)) as {
  default: ViteUserConfig;
};

export default mergeConfig(rootConfig.default, {
  root,
  plugins: plantedMutant ? [plantMutant(plantedMutant)] : [],
});
