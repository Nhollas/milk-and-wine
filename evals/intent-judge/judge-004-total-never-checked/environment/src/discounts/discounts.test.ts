import { expect, test } from "vitest";
import { priceOrder } from "./discounts.ts";

test("B1: takes 10% off every line, rounded down, and totals them", () => {
  const order = { placedOn: "2026-03-01", lines: [{ pence: 999 }, { pence: 255 }] };

  const priced = priceOrder(order, "2026-03-02");

  expect(priced.lines).toEqual([899, 229]);
});

test("B2: takes nothing off an order placed today", () => {
  const order = { placedOn: "2026-03-02", lines: [{ pence: 999 }, { pence: 255 }] };

  const priced = priceOrder(order, "2026-03-02");

  expect(priced).toEqual({ lines: [999, 255], total: 1254 });
});

test("B3: prices an order with no lines at nothing", () => {
  const priced = priceOrder({ placedOn: "2026-03-01", lines: [] }, "2026-03-02");

  expect(priced).toEqual({ lines: [], total: 0 });
});
