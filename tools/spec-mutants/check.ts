import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { isStale, readSubjectMutants, stopOnInterrupt, withMutantPlanted } from "./mutants.ts";

const SRC_ONLY_TSCONFIG = "tools/spec-mutants/src.tsconfig.json";

type CheckResult = { exitCode: number; output: string };

export function check(args: string[], root: string): CheckResult {
  const [subject] = args;
  if (!subject || args.length !== 1) {
    return { exitCode: 1, output: "usage: pnpm spec:mutants:check <subject>\n" };
  }
  const loaded = readSubjectMutants(subject, root);
  if (typeof loaded === "string") return { exitCode: 1, output: `${loaded}\n` };
  const unmutated = typeErrors(root);
  if (unmutated) {
    return {
      exitCode: 1,
      output: `src/ must typecheck before any mutant is planted:\n${unmutated}`,
    };
  }

  const interrupted = stopOnInterrupt();
  let output = "";
  let problems = 0;
  const line = (id: string, label: string, text: string) => {
    output += `${id}  ${label.padEnd(13)}  ${text}\n`;
  };
  for (const [id, scenarioMutants] of loaded.mutantsByScenario) {
    if (!loaded.scenarios.some((scenario) => scenario.id === id)) {
      problems++;
      line(id, "unknown-id", `not a scenario of ${subject}`);
      continue;
    }
    for (const mutant of scenarioMutants.mutants) {
      if (interrupted()) return { exitCode: 1, output };
      if (isStale(mutant, root)) {
        problems++;
        line(id, "stale", `${mutant.breaks}: find must appear exactly once in ${mutant.file}`);
        continue;
      }
      const errors = withMutantPlanted(mutant, root, () => typeErrors(root));
      if (errors) {
        problems++;
        line(id, "compile-error", mutant.breaks);
        output += errors;
      } else {
        line(id, "ok", mutant.breaks);
      }
    }
  }

  const unmutatedScenarios = loaded.scenarios.filter(
    (scenario) => scenario.verified.kind === "test" && !loaded.mutantsByScenario.has(scenario.id),
  );
  if (unmutatedScenarios.length > 0) {
    output += `no mutants yet: ${unmutatedScenarios.map((scenario) => scenario.id).join(", ")}\n`;
  }
  output +=
    problems === 0
      ? "spec:mutants:check passed\n"
      : `spec:mutants:check failed · ${problems} problems\n`;
  return { exitCode: problems === 0 ? 0 : 1, output };
}

function typeErrors(root: string): string {
  const result = spawnSync(join(root, "node_modules/.bin/tsc"), ["-p", SRC_ONLY_TSCONFIG], {
    cwd: root,
    encoding: "utf8",
  });
  return result.status === 0 ? "" : result.stdout;
}

if (import.meta.main) {
  const { exitCode, output } = check(process.argv.slice(2), process.cwd());
  process.stdout.write(output);
  process.exitCode = exitCode;
}
