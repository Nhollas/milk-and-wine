import type { Clock } from "../../src/clock.ts";

export function testClock() {
  let now = new Date("2026-03-02T10:00:00Z");
  const clock: Clock = () => now;

  return {
    now: clock,
    setToday(date: string) {
      now = new Date(`${date}T10:00:00Z`);
    },
    setNow(instant: string) {
      now = new Date(instant);
    },
  };
}
