import { test as base } from "vitest";
import { fakeCatalogueClient } from "./fake-catalogue-client.ts";
import { fakeNotificationsClient } from "./fake-notifications-client.ts";
import { openLibrary } from "./library.ts";

export const test = base
  .extend("catalogueClient", () => fakeCatalogueClient())
  .extend("notificationsClient", () => fakeNotificationsClient())
  .extend("library", ({ catalogueClient, notificationsClient }, { onCleanup }) => {
    const library = openLibrary({ catalogueClient, notificationsClient });
    onCleanup(library.close);
    return library;
  });
