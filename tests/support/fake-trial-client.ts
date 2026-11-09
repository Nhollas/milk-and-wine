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
  const returned: Record<string, unknown>[] = [];

  return {
    started,
    /** For each trial started, how many lines had been printed when it started. */
    linesPrintedAtStart,
    /** The record each trial returned, with measures distinct per trial. */
    returned,
    start(trial: StartedTrial) {
      started.push(trial);
      linesPrintedAtStart.push(output.lines.length);
      const record = { ...trial, wallClockMs: started.length, tokens: started.length * 100 };
      returned.push(record);
      return record;
    },
  };
}
