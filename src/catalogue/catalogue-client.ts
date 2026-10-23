import { setTimeout } from "node:timers/promises";
import { z } from "zod";
import { endpoint } from "../http.ts";

export class CatalogueUnavailable extends Error {}

type Copy = { copyId: string; title: string; available: boolean };

type CopyLookup = { kind: "found"; copy: Copy } | { kind: "not-found" };

export type CatalogueClient = { getCopy(copyId: string): Promise<CopyLookup> };

export type RetryPolicy = { attempts: number; attemptTimeoutMs: number; retryDelayMs: number };

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  attempts: 3,
  attemptTimeoutMs: 2_000,
  retryDelayMs: 100,
};

const copyResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  state: z.enum(["available", "withdrawn"]),
});

export function createCatalogueClient(
  baseUrl: string,
  retryPolicy = DEFAULT_RETRY_POLICY,
): CatalogueClient {
  const { attempts, attemptTimeoutMs, retryDelayMs } = retryPolicy;
  return {
    async getCopy(copyId) {
      const url = endpoint(baseUrl, `copies/${encodeURIComponent(copyId)}`);
      for (let attempt = 1; ; attempt++) {
        const response = await fetch(url, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(attemptTimeoutMs),
        }).catch(() => undefined);

        if (response?.status === 404) return { kind: "not-found" };
        if (response?.ok === true) return { kind: "found", copy: await readCopy(response) };
        if (response && response.status < 500) {
          throw new CatalogueUnavailable(
            `Catalogue API answered ${response.status} for copy ${copyId}`,
          );
        }
        if (attempt === attempts) {
          throw new CatalogueUnavailable(
            `Catalogue API unavailable after ${attempts} attempts for copy ${copyId}`,
          );
        }
        await setTimeout(retryDelayMs);
      }
    },
  };
}

async function readCopy(response: Response): Promise<Copy> {
  const parsed = copyResponseSchema.safeParse(await response.json().catch(() => undefined));
  if (!parsed.success)
    throw new CatalogueUnavailable("Catalogue API answered with an unreadable copy");
  return {
    copyId: parsed.data.id,
    title: parsed.data.title,
    available: parsed.data.state === "available",
  };
}
