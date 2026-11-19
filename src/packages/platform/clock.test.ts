import { expect, test } from "vitest";
import { addDays, utcDate } from "./clock.ts";

test("adds days across a month and a year end", () => {
  expect(addDays("2026-01-25", 14)).toBe("2026-02-08");
  expect(addDays("2026-12-25", 14)).toBe("2027-01-08");
});

test("reads the UTC date of an instant late in the day", () => {
  expect(utcDate(new Date("2026-03-01T23:30:00-02:00"))).toBe("2026-03-02");
});
