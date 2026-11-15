import { expect, test } from "vitest";
import { fakeNotifier } from "../../tests/support/fake-notifier.ts";
import { waitingInTurn } from "../../tests/support/waiting.ts";
import { expireOffers, offerPlaces } from "./waitlist.ts";

test("B4: sends an offer message that says the offer expires 24 hours from now", () => {
  const notifier = fakeNotifier();

  offerPlaces(waitingInTurn("ada"), [], 1, "2026-12-31T18:00:00.000Z", notifier);

  expect(notifier.sent).toEqual([
    { to: "ada", kind: "offer", expiresAt: "2027-01-01T18:00:00.000Z" },
  ]);
});

test("B8: sends an expired message to the member whose offer ran out", () => {
  const notifier = fakeNotifier();
  const offers = [{ memberId: "ada", madeAt: "2026-02-28T22:29:00.000Z", accepted: false }];

  expireOffers(offers, "2026-03-01T22:30:00.000Z", notifier);

  expect(notifier.sent).toEqual([{ to: "ada", kind: "expired" }]);
});

test("B9: sends no message about an accepted offer, however old", () => {
  const notifier = fakeNotifier();
  const offers = [{ memberId: "ada", madeAt: "2026-02-20T09:00:00.000Z", accepted: true }];

  expireOffers(offers, "2026-03-02T09:00:00.000Z", notifier);

  expect(notifier.sent).toEqual([]);
});
