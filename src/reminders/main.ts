import { z } from "zod";
import { systemClock } from "../clock.ts";
import { openDatabase } from "../database.ts";
import { logger } from "../logger.ts";
import { createNotificationsClient } from "./notifications-client.ts";
import { sendOverdueReminders } from "./send-overdue-reminders.ts";

const env = z
  .object({
    DATABASE_PATH: z.string().min(1),
    NOTIFY_URL: z.url(),
  })
  .parse(process.env);

await sendOverdueReminders({
  db: openDatabase(env.DATABASE_PATH),
  notificationsClient: createNotificationsClient(env.NOTIFY_URL),
  clock: systemClock,
  logger,
});
