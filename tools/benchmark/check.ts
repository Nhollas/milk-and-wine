type HiddenTestResult = { title: string; passed: boolean };

type HiddenTests = {
  run(taskFolder: string, against: "starter" | "solution"): HiddenTestResult[];
};

type CheckOptions = { root: string; hiddenTests: HiddenTests };

type CheckResult = { exitCode: number; output: string };

export function check(_args: string[], _options: CheckOptions): CheckResult {
  return { exitCode: 0, output: "" };
}
