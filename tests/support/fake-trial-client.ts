type StartedTrial = { task: string; agent: string };

export function fakeOutput() {
  const lines: string[] = [];

  return {
    lines,
    print: (text: string) => {
      lines.push(...text.split("\n").filter((line) => line !== ""));
    },
  };
}

export function fakeTrials(output: { lines: string[] }) {
  const started: StartedTrial[] = [];
  const linesPrintedAtStart: number[] = [];

  return {
    started,
    /** For each trial started, how many lines had been printed when it started. */
    linesPrintedAtStart,
    start(trial: StartedTrial) {
      started.push(trial);
      linesPrintedAtStart.push(output.lines.length);
      return { ...trial, wallClockMs: started.length };
    },
  };
}
