import { expect, test } from "vitest";
import { fakeNotifier } from "../../tests/support/fake-notifier.ts";
import { waitingInTurn } from "../../tests/support/waiting.ts";
import { expireOffers, offerPlaces } from "./waitlist.ts";

const NOW = "2026-03-02T09:00:00.000Z";

test("B1: offers places to the 2 who joined earliest, in the order they joined", () => {
  const waiting = [
    { memberId: "ada", joinedAt: "2026-03-01T09:01:00.000Z" },
    { memberId: "ben", joinedAt: "2026-03-01T09:02:00.000Z" },
    { memberId: "cy", joinedAt: "2026-03-01T09:00:00.000Z" },
  ];

  const offers = offerPlaces(waiting, [], 2, NOW, fakeNotifier());

  expect(offers.map(({ memberId }) => memberId)).toEqual(["cy", "ada"]);
});

test("B2: offers the place to the member whose ID sorts first when two joined together", () => {
  const waiting = [
    { memberId: "ben", joinedAt: "2026-03-01T09:00:00.000Z" },
    { memberId: "ada", joinedAt: "2026-03-01T09:00:00.000Z" },
  ];

  const offers = offerPlaces(waiting, [], 1, NOW, fakeNotifier());

  expect(offers.map(({ memberId }) => memberId)).toEqual(["ada"]);
});

test("B3: offers every waiting member one place when there are places to spare", () => {
  const waiting = waitingInTurn("ada", "ben");

  const offers = offerPlaces(waiting, [], 5, NOW, fakeNotifier());

  expect(offers.map(({ memberId }) => memberId)).toEqual(["ada", "ben"]);
});

test("B5: makes no offer when no one is waiting", () => {
  const offers = offerPlaces([], [], 2, NOW, fakeNotifier());

  expect(offers).toEqual([]);
});

test("B6: skips a member holding an offer that hasn't expired", () => {
  const waiting = waitingInTurn("ada", "ben");
  const held = [{ memberId: "ada", madeAt: "2026-03-02T08:00:00.000Z", accepted: false }];

  const offers = offerPlaces(waiting, held, 1, NOW, fakeNotifier());

  expect(offers.map(({ memberId }) => memberId)).toEqual(["ben"]);
});

test("B6: offers again to a member whose offer has expired", () => {
  const waiting = waitingInTurn("ada", "ben");
  const lapsed = [{ memberId: "ada", madeAt: "2026-03-01T08:00:00.000Z", accepted: false }];

  const offers = offerPlaces(waiting, lapsed, 1, NOW, fakeNotifier());

  expect(offers.map(({ memberId }) => memberId)).toEqual(["ada"]);
});

test("B7: keeps an offer made 24 hours ago or less", () => {
  const offers = [{ memberId: "ada", madeAt: "2026-02-28T23:30:00.000Z", accepted: false }];

  const { kept } = expireOffers(offers, "2026-03-01T22:30:00.000Z", fakeNotifier());

  expect(kept.map(({ memberId }) => memberId)).toEqual(["ada"]);
});

test("B8: expires an offer made more than 24 hours ago", () => {
  const offers = [{ memberId: "ada", madeAt: "2026-02-28T22:29:00.000Z", accepted: false }];

  const { expired } = expireOffers(offers, "2026-03-01T22:30:00.000Z", fakeNotifier());

  expect(expired.map(({ memberId }) => memberId)).toEqual(["ada"]);
});

test("B9: keeps an accepted offer, however old", () => {
  const offers = [{ memberId: "ada", madeAt: "2026-02-20T09:00:00.000Z", accepted: true }];

  const { kept } = expireOffers(offers, NOW, fakeNotifier());

  expect(kept.map(({ memberId }) => memberId)).toEqual(["ada"]);
});
