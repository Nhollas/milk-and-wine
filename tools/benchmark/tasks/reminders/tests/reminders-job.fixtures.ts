import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test as base } from "vitest";

// The repository under test: hidden tests are copied into a folder at its root.
const REPOSITORY = join(import.meta.dirname, "..");

// The database as the loans service leaves it before the reminders job ever runs.
const LOANS_SCHEMA = `
  CREATE TABLE loans (
    loan_id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    copy_id TEXT NOT NULL,
    lent_on TEXT NOT NULL,
    due_on TEXT NOT NULL,
    returned_on TEXT
  );
  CREATE UNIQUE INDEX one_current_loan_per_copy ON loans (copy_id) WHERE returned_on IS NULL;
`;

type ReceivedRequest = { method: string | undefined; path: string | undefined; body: unknown };

type Log = Record<string, unknown>;

type Loan = { loanId: string; memberId: string; dueOn: string; returnedOn?: string };

/** The UTC date `days` days from today, as `YYYY-MM-DD`. */
export function utcDate(days: number): string {
  const instant = new Date();
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// A Notifications API on a local port: answers 202 unless told otherwise, and keeps what it got.
async function notificationsApi() {
  const received: ReceivedRequest[] = [];
  const statusFor = new Map<string, number>();
  let status = 202;

  const server: Server = createServer((request, response) => {
    let text = "";
    request.on("data", (chunk: Buffer) => {
      text += chunk.toString();
    });
    request.on("end", () => {
      const body = parseJson(text);
      received.push({ method: request.method, path: request.url, body });
      const memberId = (body as { memberId?: string } | undefined)?.memberId ?? "";
      response.writeHead(statusFor.get(memberId) ?? status).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    /** Every request received, in order. */
    received,
    /** The `memberId` of every request received, in order. */
    get notifiedMembers(): unknown[] {
      return received.map(({ body }) => (body as { memberId?: unknown } | undefined)?.memberId);
    },
    answers(newStatus: number) {
      status = newStatus;
    },
    answersFor(memberId: string, memberStatus: number) {
      statusFor.set(memberId, memberStatus);
    },
    async stop() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

function loansDatabase() {
  const folder = mkdtempSync(join(tmpdir(), "reminders-hidden-"));
  const path = join(folder, "loans.db");
  const db = new DatabaseSync(path);
  db.exec(LOANS_SCHEMA);
  db.close();

  return {
    path,
    add({ loanId, memberId, dueOn, returnedOn }: Loan) {
      const connection = new DatabaseSync(path);
      const lentOn = new Date(`${dueOn}T00:00:00Z`);
      lentOn.setUTCDate(lentOn.getUTCDate() - 14);
      connection
        .prepare(
          "INSERT INTO loans (loan_id, member_id, copy_id, lent_on, due_on, returned_on) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(
          loanId,
          memberId,
          `copy-of-${loanId}`,
          lentOn.toISOString().slice(0, 10),
          dueOn,
          returnedOn ?? null,
        );
      connection.close();
    },
    remove() {
      rmSync(folder, { recursive: true, force: true });
    },
  };
}

// Runs the job as the platform would: the `start:reminders` script, with its two settings.
function remindersJob(databasePath: string, defaultNotifyUrl: string) {
  return {
    /** Runs the job to its end and returns the logs it wrote. Fails unless it exits 0. */
    async run({ notifyUrl = defaultNotifyUrl }: { notifyUrl?: string } = {}): Promise<Log[]> {
      const { scripts } = JSON.parse(readFileSync(join(REPOSITORY, "package.json"), "utf8")) as {
        scripts?: Record<string, string>;
      };
      const script = scripts?.["start:reminders"];
      if (script === undefined) throw new Error("package.json has no start:reminders script");
      const stdout = await new Promise<string>((resolve, reject) => {
        execFile(
          "sh",
          ["-c", script],
          {
            cwd: REPOSITORY,
            timeout: 20_000,
            env: {
              ...process.env,
              PATH: `${join(REPOSITORY, "node_modules/.bin")}:${process.env["PATH"] ?? ""}`,
              DATABASE_PATH: databasePath,
              NOTIFY_URL: notifyUrl,
            },
          },
          (error, output, errors) => {
            if (error) reject(new Error(`the reminders job failed: ${error.message}\n${errors}`));
            else resolve(output);
          },
        );
      });
      return stdout
        .split("\n")
        .map((line) => parseJson(line))
        .filter((log): log is Log => typeof log === "object" && log !== null);
    },
  };
}

export const test = base
  .extend("notificationsApi", async ({}, { onCleanup }) => {
    const api = await notificationsApi();
    onCleanup(() => api.stop());
    return api;
  })
  .extend("loans", ({}, { onCleanup }) => {
    const loans = loansDatabase();
    onCleanup(() => loans.remove());
    return loans;
  })
  .extend("job", ({ loans, notificationsApi: api }) => remindersJob(loans.path, api.url));
