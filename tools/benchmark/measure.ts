type HiddenTestResult = { title: string; passed: boolean };

type Grade = {
  /** Scenarios whose hidden tests all pass, over the task's scenarios. */
  passRate: number;
  /** The scenarios with a hidden test that failed, or with none that ran. */
  failedScenarios: string[];
};

// A hidden test's title starts with its scenario's ID, as in "B2: costs 4 for two".
export function gradeScenarios(scenarioIds: string[], results: HiddenTestResult[]): Grade {
  const failedScenarios = scenarioIds.filter((id) => {
    const ofScenario = results.filter(({ title }) => title.split(":")[0] === id);
    return ofScenario.length === 0 || ofScenario.some(({ passed }) => !passed);
  });
  return {
    passRate: (scenarioIds.length - failedScenarios.length) / scenarioIds.length,
    failedScenarios,
  };
}
