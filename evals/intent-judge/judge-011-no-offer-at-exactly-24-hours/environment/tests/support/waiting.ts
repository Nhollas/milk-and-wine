import type { Waiting } from "../../src/waitlist/waitlist.ts";

const FIRST_JOINED_AT = Date.parse("2026-03-01T09:00:00.000Z");

const MINUTE_MS = 60 * 1000;

/** Members waiting, each of whom joined a minute after the one before. */
export function waitingInTurn(...memberIds: string[]): Waiting[] {
  return memberIds.map((memberId, index) => ({
    memberId,
    joinedAt: new Date(FIRST_JOINED_AT + index * MINUTE_MS).toISOString(),
  }));
}
