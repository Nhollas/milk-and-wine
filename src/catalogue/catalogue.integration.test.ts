import { http, HttpResponse, delay } from "msw";
import { expect, test } from "vitest";
import { CatalogueUnavailable, createCatalogueClient } from "./catalogue-client.ts";
import { CATALOGUE_URL, catalogueAnswering } from "../../tests/support/fake-catalogue.ts";
import { network } from "../../tests/support/network.ts";

const catalogue = createCatalogueClient(CATALOGUE_URL);

test("B1: requests the copy by ID and reads whether it can be lent", async () => {
  const requests: { path: string; accept: string | null }[] = [];
  network.use(
    http.get(`${CATALOGUE_URL}/copies/:copyId`, ({ request, params }) => {
      requests.push({ path: new URL(request.url).pathname, accept: request.headers.get("accept") });
      const state = params["copyId"] === "copy 1" ? "available" : "withdrawn";
      return HttpResponse.json({ id: params["copyId"], title: "Middlemarch", state });
    }),
  );

  expect(await catalogue.getCopy("copy 1")).toEqual({
    kind: "found",
    copy: { copyId: "copy 1", title: "Middlemarch", available: true },
  });
  expect(await catalogue.getCopy("copy-2")).toEqual({
    kind: "found",
    copy: { copyId: "copy-2", title: "Middlemarch", available: false },
  });
  expect(requests).toEqual([
    { path: "/copies/copy%201", accept: "application/json" },
    { path: "/copies/copy-2", accept: "application/json" },
  ]);
});

test("B2: reports an unknown copy without retrying", async () => {
  const api = catalogueAnswering(404);

  expect(await catalogue.getCopy("copy-9")).toEqual({ kind: "not-found" });
  expect(api.requests).toHaveLength(1);
});

test("B3: gives up after three attempts while the catalogue keeps failing", async () => {
  const api = catalogueAnswering(503);

  await expect(catalogue.getCopy("copy-1")).rejects.toThrow(CatalogueUnavailable);
  expect(api.requests).toHaveLength(3);
});

test("B3: gives up after three attempts while the connection fails", async () => {
  let attempts = 0;
  network.use(
    http.get(`${CATALOGUE_URL}/copies/:copyId`, () => {
      attempts++;
      return HttpResponse.error();
    }),
  );

  await expect(catalogue.getCopy("copy-1")).rejects.toThrow(CatalogueUnavailable);
  expect(attempts).toBe(3);
});

test("B3: abandons an attempt after two seconds and tries again", async () => {
  let attempts = 0;
  network.use(
    http.get(`${CATALOGUE_URL}/copies/:copyId`, async () => {
      attempts++;
      if (attempts === 1) await delay("infinite");
      return HttpResponse.json({ id: "copy-1", title: "Middlemarch", state: "available" });
    }),
  );
  const started = performance.now();

  expect((await catalogue.getCopy("copy-1")).kind).toBe("found");
  expect(attempts).toBe(2);
  expect(performance.now() - started).toBeGreaterThanOrEqual(2_000);
});

test("B4: refuses an unreadable answer or an unexpected client error without retrying", async () => {
  let attempts = 0;
  network.use(
    http.get(`${CATALOGUE_URL}/copies/:copyId`, () => {
      attempts++;
      return HttpResponse.json({ id: "copy-1", state: "lost" });
    }),
  );
  await expect(catalogue.getCopy("copy-1")).rejects.toThrow(CatalogueUnavailable);
  expect(attempts).toBe(1);

  const api = catalogueAnswering(401);
  await expect(catalogue.getCopy("copy-1")).rejects.toThrow(CatalogueUnavailable);
  expect(api.requests).toHaveLength(1);
});
