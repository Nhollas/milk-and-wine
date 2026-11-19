import { z } from "zod";
import { systemClock } from "@milk-and-wine/platform/clock";
import { openDatabase } from "@milk-and-wine/platform/database";
import { logger } from "@milk-and-wine/platform/logger";
import { createNotificationsClient } from "@milk-and-wine/notifications-client";
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
