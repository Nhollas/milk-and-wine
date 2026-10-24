import { expect, test } from "vitest";
import { postJson } from "../support/json-requests.ts";

const baseUrl = process.env["SMOKE_BASE_URL"] ?? "";

test("B1: the deployed service reports healthy", async () => {
  const healthResponse = await fetch(new URL("/health", baseUrl));

  expect(healthResponse.status).toBe(200);
  expect(await healthResponse.json()).toEqual({ status: "ok" });
});

test("B2: the deployed service lends and takes back the smoke copy", async () => {
  const lendResponse = await fetch(
    new URL("/loans", baseUrl),
    postJson({ memberId: "smoke-test", copyId: "SMOKE-1" }),
  );
  const { loanId } = (await lendResponse.json()) as { loanId: string };
  const returnResponse = await fetch(new URL(`/loans/${loanId}/return`, baseUrl), postJson());

  expect(lendResponse.status).toBe(201);
  expect(returnResponse.status).toBe(200);
});
