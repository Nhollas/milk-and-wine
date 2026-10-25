export type CommandResult = { exitCode: number; output: string };

export async function runFromCommandLine(
  command: (args: string[], root: string) => Promise<CommandResult>,
): Promise<void> {
  const { exitCode, output } = await command(process.argv.slice(2), process.cwd());
  process.stdout.write(output);
  process.exitCode = exitCode;
}
