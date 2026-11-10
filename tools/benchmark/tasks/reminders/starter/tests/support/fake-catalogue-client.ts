import type { CatalogueClient } from "../../src/catalogue/catalogue-client.ts";

type CopyState = "available" | "withdrawn";

export function fakeCatalogueClient() {
  const copies = new Map<string, CopyState>();
  const lookups: string[] = [];
  let unavailable = false;

  const catalogueClient: CatalogueClient = {
    async getCopy(copyId) {
      lookups.push(copyId);
      if (unavailable) return { kind: "failed" };
      const state = copies.get(copyId);
      if (!state) return { kind: "not-found" };
      return {
        kind: "found",
        copy: { copyId, title: `Title of ${copyId}`, available: state === "available" },
      };
    },
  };

  return {
    ...catalogueClient,
    lookups,
    addCopies(added: Record<string, CopyState>) {
      for (const [copyId, state] of Object.entries(added)) copies.set(copyId, state);
    },
    becomeUnavailable() {
      unavailable = true;
    },
  };
}
