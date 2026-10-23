import { test as base } from "vitest";
import { createCatalogueClient } from "../../src/catalogue/catalogue-client.ts";
import { createNotificationsClient } from "../../src/reminders/notifications-client.ts";
import { CATALOGUE_URL } from "../support/catalogue-api.handlers.ts";
import { NOTIFY_URL } from "../support/notifications-api.handlers.ts";
import { openLibrary } from "../support/library.ts";

export const test = base.extend("library", ({}, { onCleanup }) => {
  const library = openLibrary({
    catalogueClient: createCatalogueClient(CATALOGUE_URL),
    notificationsClient: createNotificationsClient(NOTIFY_URL),
  });
  onCleanup(() => library.close());
  return library;
});
