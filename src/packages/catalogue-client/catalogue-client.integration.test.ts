import { http, HttpResponse, delay } from "msw";
import { expect, test } from "vitest";
import { createCatalogueClient, DEFAULT_RETRY_POLICY } from "./catalogue-client.ts";
import {
  CATALOGUE_URL,
  COPY_PATH,
  copyResponse,
} from "../../../tests/support/catalogue-api.handlers.ts";
import { httpInterceptor } from "../../../tests/support/http-interceptor.ts";

const catalogueClient = createCatalogueClient(CATALOGUE_URL);

test("B1: requests the copy by its encoded ID, as JSON, and reads an available copy", async () => {
  const requests: { path: string; accept: string | null }[] = [];
  httpInterceptor.use(
    http.get(COPY_PATH, ({ request }) => {
      requests.push({ path: new URL(request.url).pathname, accept: request.headers.get("accept") });
      return HttpResponse.json({ id: "copy 1", title: "Middlemarch", state: "available" });
    }),
  );

  const lookup = await catalogueClient.getCopy("copy 1");

  expect(lookup).toEqual({
    kind: "found",
    copy: { copyId: "copy 1", title: "Middlemarch", available: true },
  });
  expect(requests).toEqual([{ path: "/copies/copy%201", accept: "application/json" }]);
});

test("B1: reads a withdrawn copy as not available", async () => {
  httpInterceptor.use(
    http.get(COPY_PATH, () =>
      HttpResponse.json({ id: "copy-2", title: "Middlemarch", state: "withdrawn" }),
    ),
  );

  const lookup = await catalogueClient.getCopy("copy-2");

  expect(lookup).toEqual({
    kind: "found",
    copy: { copyId: "copy-2", title: "Middlemarch", available: false },
  });
});

test("B2: reports an unknown copy without retrying", async () => {
  httpInterceptor.use(
    http.get(COPY_PATH, function* () {
      yield new HttpResponse(null, { status: 404 });
      return copyResponse("copy-9", "available");
    }),
  );

  expect(await catalogueClient.getCopy("copy-9")).toEqual({ kind: "not-found" });
});

test("B3: gives up after three attempts while the catalogue keeps failing", async () => {
  httpInterceptor.use(
    http.get(COPY_PATH, function* () {
      yield new HttpResponse(null, { status: 503 });
      yield new HttpResponse(null, { status: 503 });
      yield new HttpResponse(null, { status: 503 });
      return copyResponse("copy-1", "available");
    }),
  );

  expect((await catalogueClient.getCopy("copy-1")).kind).toBe("failed");
});

test("B3: still answers when the third attempt succeeds", async () => {
  httpInterceptor.use(
    http.get(COPY_PATH, function* () {
      yield new HttpResponse(null, { status: 500 });
      yield new HttpResponse(null, { status: 503 });
      return copyResponse("copy-1", "available");
    }),
  );

  expect((await catalogueClient.getCopy("copy-1")).kind).toBe("found");
});

test("B6: gives up after three attempts while the connection fails", async () => {
  httpInterceptor.use(
    http.get(COPY_PATH, function* () {
      yield HttpResponse.error();
      yield HttpResponse.error();
      yield HttpResponse.error();
      return copyResponse("copy-1", "available");
    }),
  );

  expect((await catalogueClient.getCopy("copy-1")).kind).toBe("failed");
});

test("B6: still answers when the third attempt connects", async () => {
  httpInterceptor.use(
    http.get(COPY_PATH, function* () {
      yield HttpResponse.error();
      yield HttpResponse.error();
      return copyResponse("copy-1", "available");
    }),
  );

  expect((await catalogueClient.getCopy("copy-1")).kind).toBe("found");
});

test("B3: leaves 100 ms between attempts", async () => {
  httpInterceptor.use(http.get(COPY_PATH, () => new HttpResponse(null, { status: 503 })));
  const startedAt = performance.now();

  const lookup = await catalogueClient.getCopy("copy-1");
  const finishedAt = performance.now();

  expect(lookup.kind).toBe("failed");
  expect(finishedAt - startedAt).toBeGreaterThanOrEqual(200);
});

test("B7: abandons an attempt after two seconds and tries again", async () => {
  httpInterceptor.use(
    http.get(COPY_PATH, () => delay("infinite"), { once: true }),
    http.get(COPY_PATH, () => copyResponse("copy-1", "available")),
  );
  const impatientCatalogueClient = createCatalogueClient(CATALOGUE_URL, {
    ...DEFAULT_RETRY_POLICY,
    attemptTimeoutMs: 50,
  });
  const startedAt = performance.now();

  const lookup = await impatientCatalogueClient.getCopy("copy-1");
  const finishedAt = performance.now();

  expect(lookup.kind).toBe("found");
  expect(finishedAt - startedAt).toBeGreaterThanOrEqual(50);
  expect(DEFAULT_RETRY_POLICY.attemptTimeoutMs).toBe(2_000);
});

test.each([
  { problem: "an unknown state", body: { id: "copy-1", title: "Middlemarch", state: "lost" } },
  { problem: "no title", body: { id: "copy-1", state: "available" } },
])("B4: refuses an answer with $problem without retrying", async ({ body }) => {
  httpInterceptor.use(
    http.get(COPY_PATH, function* () {
      yield HttpResponse.json(body);
      return copyResponse("copy-1", "available");
    }),
  );

  expect((await catalogueClient.getCopy("copy-1")).kind).toBe("failed");
});

test.each([400, 401])("B8: refuses a %i without retrying", async (status) => {
  httpInterceptor.use(
    http.get(COPY_PATH, function* () {
      yield new HttpResponse(null, { status });
      return copyResponse("copy-1", "available");
    }),
  );

  expect((await catalogueClient.getCopy("copy-1")).kind).toBe("failed");
});
