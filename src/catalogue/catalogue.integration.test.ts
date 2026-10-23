import { http, HttpResponse, delay } from "msw";
import { expect, test } from "vitest";
import { createCatalogueClient, DEFAULT_RETRY_POLICY } from "./catalogue-client.ts";
import {
  CATALOGUE_URL,
  COPY_PATH,
  copyResponse,
} from "../../tests/support/catalogue-api.handlers.ts";
import { httpInterceptor } from "../../tests/support/http-interceptor.ts";

const catalogueClient = createCatalogueClient(CATALOGUE_URL);

test("B1: requests the copy by ID and reads whether it can be lent", async () => {
  const requests: { path: string; accept: string | null }[] = [];
  httpInterceptor.use(
    http.get(COPY_PATH, ({ request, params }) => {
      requests.push({ path: new URL(request.url).pathname, accept: request.headers.get("accept") });
      const state = params["copyId"] === "copy 1" ? "available" : "withdrawn";
      return HttpResponse.json({ id: params["copyId"], title: "Middlemarch", state });
    }),
  );

  expect(await catalogueClient.getCopy("copy 1")).toEqual({
    kind: "found",
    copy: { copyId: "copy 1", title: "Middlemarch", available: true },
  });
  expect(await catalogueClient.getCopy("copy-2")).toEqual({
    kind: "found",
    copy: { copyId: "copy-2", title: "Middlemarch", available: false },
  });
  expect(requests).toEqual([
    { path: "/copies/copy%201", accept: "application/json" },
    { path: "/copies/copy-2", accept: "application/json" },
  ]);
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

  expect((await catalogueClient.getCopy("copy-1")).kind).toBe("unavailable");
});

test("B3: still answers when the third attempt succeeds", async () => {
  httpInterceptor.use(
    http.get(COPY_PATH, function* () {
      yield new HttpResponse(null, { status: 503 });
      yield new HttpResponse(null, { status: 503 });
      return copyResponse("copy-1", "available");
    }),
  );

  expect((await catalogueClient.getCopy("copy-1")).kind).toBe("found");
});

test("B3: gives up after three attempts while the connection fails", async () => {
  httpInterceptor.use(
    http.get(COPY_PATH, function* () {
      yield HttpResponse.error();
      yield HttpResponse.error();
      yield HttpResponse.error();
      return copyResponse("copy-1", "available");
    }),
  );

  expect((await catalogueClient.getCopy("copy-1")).kind).toBe("unavailable");
});

test("B3: abandons an attempt after two seconds and tries again", async () => {
  httpInterceptor.use(
    http.get(COPY_PATH, () => delay("infinite"), { once: true }),
    http.get(COPY_PATH, () => copyResponse("copy-1", "available")),
  );
  const impatientCatalogueClient = createCatalogueClient(CATALOGUE_URL, {
    ...DEFAULT_RETRY_POLICY,
    attemptTimeoutMs: 50,
  });
  const started = performance.now();

  expect((await impatientCatalogueClient.getCopy("copy-1")).kind).toBe("found");
  expect(performance.now() - started).toBeGreaterThanOrEqual(50);
  expect(DEFAULT_RETRY_POLICY.attemptTimeoutMs).toBe(2_000);
});

test("B4: refuses an unreadable answer without retrying", async () => {
  httpInterceptor.use(
    http.get(COPY_PATH, function* () {
      yield HttpResponse.json({ id: "copy-1", state: "lost" });
      return copyResponse("copy-1", "available");
    }),
  );

  expect((await catalogueClient.getCopy("copy-1")).kind).toBe("unavailable");
});

test("B4: refuses an unexpected client error without retrying", async () => {
  httpInterceptor.use(
    http.get(COPY_PATH, function* () {
      yield new HttpResponse(null, { status: 401 });
      return copyResponse("copy-1", "available");
    }),
  );

  expect((await catalogueClient.getCopy("copy-1")).kind).toBe("unavailable");
});
