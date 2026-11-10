import { test as base } from "vitest";
import { openDatabase } from "../../src/database.ts";
import { createLoansApp } from "../../src/loans/loans-app.ts";
import { fakeCatalogueClient } from "./fake-catalogue-client.ts";
import { testClock } from "./test-clock.ts";

export const test = base
  .extend("fakeCatalogue", () => fakeCatalogueClient())
  .extend("clock", () => testClock())
  .extend("db", ({}, { onCleanup }) => {
    const db = openDatabase(":memory:");
    onCleanup(() => {
      if (db.isOpen) db.close();
    });
    return db;
  })
  .extend("app", ({ db, fakeCatalogue, clock }) =>
    createLoansApp({ db, catalogueClient: fakeCatalogue, clock: clock.now }),
  );
