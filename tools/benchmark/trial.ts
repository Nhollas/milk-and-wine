type TokenCounts = {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
};

type TrialOptions = {
  root: string;
  /** A folder the trial may write its Harbor task folder and Harbor's output folder in. */
  workFolder: string;
  /** Harbor: takes the arguments after `harbor` (`run -p <task folder> ...`) and waits for it to finish. */
  harbor(args: string[]): { exitCode: number };
};

type TrialRecord = {
  task: string;
  agent: string;
  wallClockMs: number;
  tokens: Record<string, TokenCounts>;
};

// Placeholder so the trial tests fail on assertions; the ticket replaces it.
export function runTrial(
  trial: { task: string; agent: string },
  _options: TrialOptions,
): TrialRecord {
  return { ...trial, wallClockMs: 0, tokens: {} };
}
