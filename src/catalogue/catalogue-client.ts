import { setTimeout } from "node:timers/promises";
import { z } from "zod";
import { endpoint } from "../http.ts";

export class CatalogueUnavailable extends Error {}

export type Copy = { copyId: string; title: string; available: boolean };

export type CopyLookup = { kind: "found"; copy: Copy } | { kind: "not-found" };

export type Catalogue = { getCopy(copyId: string): Promise<CopyLookup> };

const ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 2_000;
const RETRY_DELAY_MS = 100;

const copyResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  state: z.enum(["available", "withdrawn"]),
});

export function createCatalogueClient(baseUrl: string): Catalogue {
  return {
    async getCopy(copyId) {
      const url = endpoint(baseUrl, `copies/${encodeURIComponent(copyId)}`);
      for (let attempt = 1; ; attempt++) {
        const response = await fetch(url, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        }).catch(() => undefined);

        if (response?.status === 404) return { kind: "not-found" };
        if (response?.ok) return { kind: "found", copy: await readCopy(response) };
        if (response && response.status < 500) {
          throw new CatalogueUnavailable(`Catalogue API answered ${response.status} for copy ${copyId}`);
        }
        if (attempt === ATTEMPTS) {
          throw new CatalogueUnavailable(`Catalogue API unavailable after ${ATTEMPTS} attempts for copy ${copyId}`);
        }
        await setTimeout(RETRY_DELAY_MS);
      }
    },
  };
}

async function readCopy(response: Response): Promise<Copy> {
  const parsed = copyResponseSchema.safeParse(await response.json().catch(() => undefined));
  if (!parsed.success) throw new CatalogueUnavailable("Catalogue API answered with an unreadable copy");
  return { copyId: parsed.data.id, title: parsed.data.title, available: parsed.data.state === "available" };
}
