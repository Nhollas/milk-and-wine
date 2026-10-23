export type CommandResult = { exitCode: number; output: string };

export function runFromCommandLine(command: (args: string[], root: string) => CommandResult): void {
  const { exitCode, output } = command(process.argv.slice(2), process.cwd());
  process.stdout.write(output);
  process.exitCode = exitCode;
}
