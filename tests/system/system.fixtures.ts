import { test as base } from "vitest";
import { createCatalogueClient } from "../../src/catalogue/catalogue-client.ts";
import { openDatabase } from "../../src/database.ts";
import { createLogger } from "../../src/log.ts";
import { createLoansApp } from "../../src/loans/loans-app.ts";
import { createNotificationsClient } from "../../src/reminders/notifications-client.ts";
import { sendOverdueReminders } from "../../src/reminders/send-overdue-reminders.ts";
import { CATALOGUE_URL } from "../support/catalogue-api.handlers.ts";
import { NOTIFY_URL } from "../support/notifications-api.handlers.ts";
import { testClock } from "../support/test-clock.ts";

export const test = base
  .extend("clock", () => testClock())
  .extend("db", ({}, { onCleanup }) => {
    const db = openDatabase(":memory:");
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
