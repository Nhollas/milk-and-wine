import { z } from "zod";
import { systemClock } from "../clock.ts";
import { openDatabase } from "../database.ts";
import { stdoutLog } from "../log.ts";
import { createReminderSweep } from "./reminder-sweep.ts";

const env = z
  .object({
    DATABASE_PATH: z.string().min(1),
    NOTIFY_URL: z.url(),
  })
  .parse(process.env);

const sweep = createReminderSweep({
  db: openDatabase(env.DATABASE_PATH),
  notifyUrl: env.NOTIFY_URL,
  clock: systemClock,
  log: stdoutLog,
});

await sweep();
