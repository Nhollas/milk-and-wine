import { z } from "zod";
import { systemClock } from "../clock.ts";
import { openDatabase } from "../database.ts";
import { logger } from "../log.ts";
import { createNotificationsClient } from "./notifications-client.ts";
import { createReminderSweep } from "./reminder-sweep.ts";

const env = z
  .object({
    DATABASE_PATH: z.string().min(1),
    NOTIFY_URL: z.url(),
  })
  .parse(process.env);

const sweep = createReminderSweep({
  db: openDatabase(env.DATABASE_PATH),
  notificationsClient: createNotificationsClient(env.NOTIFY_URL),
  clock: systemClock,
  logger,
});

await sweep();
