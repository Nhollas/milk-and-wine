import { test as base } from "vitest";
import { openDatabase } from "../../src/database.ts";
import { createLogger, type LogEntry } from "../../src/logger.ts";
import { createLoansApp } from "../../src/loans/loans-app.ts";
import { sendOverdueReminders } from "../../src/reminders/send-overdue-reminders.ts";
import { fakeCatalogueClient } from "./fake-catalogue-client.ts";
import { fakeNotificationsClient } from "./fake-notifications-client.ts";
import { testClock } from "./test-clock.ts";

export const test = base
  .extend("fakeCatalogue", () => fakeCatalogueClient())
  .extend("fakeNotifications", () => fakeNotificationsClient())
  .extend("clock", () => testClock())
  .extend("timeZone", ({}, { onCleanup }) => {
    const original = process.env["TZ"];
    onCleanup(() => {
      process.env["TZ"] = original;
    });
    return {
      setTo(zone: string) {
        process.env["TZ"] = zone;
      },
    };
  })
  .extend("logs", (): LogEntry[] => [])
  .extend("db", ({}, { onCleanup }) => {
    const db = openDatabase(":memory:");
    onCleanup(() => {
      if (db.isOpen) db.close();
    });
    return db;
  })
  .extend("app", ({ db, fakeCatalogue, clock }) =>
    createLoansApp({ db, catalogueClient: fakeCatalogue, clock: clock.now }),
  )
  .extend(
    "sendOverdueReminders",
    ({ db, fakeNotifications, clock, logs }) =>
      () =>
        sendOverdueReminders({
          db,
          notificationsClient: fakeNotifications,
          clock: clock.now,
          logger: createLogger((entry) => {
            logs.push(entry);
          }),
        }),
  );
