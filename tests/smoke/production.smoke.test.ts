import { expect, test } from "vitest";

const baseUrl = process.env["SMOKE_BASE_URL"] ?? "";
const SMOKE_COPY = "SMOKE-1";

async function call(method: string, path: string, body?: unknown) {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

test("B1: the deployed service reports healthy", async () => {
  expect(await call("GET", "/health")).toEqual({ status: 200, body: { status: "ok" } });
});

test("B2: the deployed service lends and takes back the smoke copy", async () => {
  const lent = await call("POST", "/loans", { memberId: "smoke-test", copyId: SMOKE_COPY });
  expect(lent.status).toBe(201);

  const returned = await call("POST", `/loans/${String(lent.body["loanId"])}/return`);
  expect(returned.status).toBe(200);
});
