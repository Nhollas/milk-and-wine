type Sandbox = {
  folder: string;
  exec(command: string[], env: Record<string, string>): { exitCode: number; stdout: string };
};

type TokenCounts = {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
};

type TrialOptions = {
  root: string;
  sandboxes: { create(): Sandbox };
  now: () => Date;
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
