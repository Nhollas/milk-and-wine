import { test as base } from "vitest";
import { createCatalogueClient } from "@milk-and-wine/catalogue-client";
import { createDatabase } from "@milk-and-wine/platform/database";
import { createLogger } from "@milk-and-wine/platform/logger";
import { createLoansApp } from "@milk-and-wine/loans-api/loans-app";
import { createNotificationsClient } from "@milk-and-wine/notifications-client";
import { sendOverdueReminders } from "@milk-and-wine/reminders-job/send-overdue-reminders";
import { CATALOGUE_URL } from "../support/catalogue-api.handlers.ts";
import { NOTIFY_URL } from "../support/notifications-api.handlers.ts";
import { testClock } from "../support/test-clock.ts";

export const test = base
  .extend("clock", () => testClock())
  .extend("db", ({}, { onCleanup }) => {
    const db = createDatabase(":memory:");
    onCleanup(() => db.close());
    return db;
  })
  .extend("app", ({ db, clock }) =>
    createLoansApp({ db, catalogueClient: createCatalogueClient(CATALOGUE_URL), clock: clock.now }),
  )
  .extend(
    "sendOverdueReminders",
    ({ db, clock }) =>
      () =>
        sendOverdueReminders({
          db,
          notificationsClient: createNotificationsClient(NOTIFY_URL),
          clock: clock.now,
          logger: createLogger(() => {}),
        }),
  );
