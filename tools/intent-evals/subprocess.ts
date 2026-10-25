import { spawn } from "node:child_process";

export type Finished = { exitCode: number | null; stdout: string };

/** Runs a command to its end, with no input and without keeping what it prints on stderr. */
export function runProcess(
  command: string,
  args: string[],
  options: { cwd: string; timeoutMs: number },
): Promise<Finished> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      timeout: options.timeoutMs,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    child.on("error", reject);
    child.on("close", (exitCode) =>
      resolve({ exitCode, stdout: Buffer.concat(chunks).toString("utf8") }),
    );
  });
}
