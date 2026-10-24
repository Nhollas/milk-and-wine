import { setTimeout } from "node:timers/promises";
import { z } from "zod";
import { endpoint } from "../http.ts";

type Copy = { copyId: string; title: string; available: boolean };

type CopyLookup = { kind: "found"; copy: Copy } | { kind: "not-found" } | { kind: "unavailable" };

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
        if (response?.ok === true) return copyLookup(response);
        if (response && response.status < 500) return { kind: "unavailable" };
        if (attempt === attempts) return { kind: "unavailable" };
        await setTimeout(retryDelayMs);
      }
    },
  };
}

async function copyLookup(response: Response): Promise<CopyLookup> {
  const parsed = copyResponseSchema.safeParse(await response.json().catch(() => undefined));
  if (!parsed.success) return { kind: "unavailable" };
  return {
    kind: "found",
    copy: {
      copyId: parsed.data.id,
      title: parsed.data.title,
      available: parsed.data.state === "available",
    },
  };
}
