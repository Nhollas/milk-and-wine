type StartedTrial = { task: string; agent: string };

export function fakeOutput() {
  let printed = "";

  return {
    /** What was printed, read as one stream and split on line breaks. */
    get lines(): string[] {
      return printed.split("\n").filter((line) => line !== "");
    },
    print: (text: string) => {
      printed += text;
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
