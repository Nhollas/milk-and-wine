export type Waiting = { memberId: string; joinedAt: string };

export type Offer = { memberId: string; madeAt: string; accepted: boolean };

export type Message =
  | { to: string; kind: "offer"; expiresAt: string }
  | { to: string; kind: "expired" };

export type Notifier = { send(message: Message): void };

const OFFER_LASTS_MS = 24 * 60 * 60 * 1000;

/** Offers `places` to the members waiting longest who hold no offer, and tells each of them. */
export function offerPlaces(
  waiting: Waiting[],
  offers: Offer[],
  places: number,
  now: string,
  notifier: Notifier,
): Offer[] {
  const holding = new Set(
    offers.filter((offer) => !hasExpired(offer, now)).map((offer) => offer.memberId),
  );
  const next = waiting
    .filter(({ memberId }) => !holding.has(memberId))
    .toSorted(
      (a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.memberId.localeCompare(b.memberId),
    )
    .slice(0, places);
  const expiresAt = new Date(Date.parse(now) + OFFER_LASTS_MS).toISOString();
  return next.map(({ memberId }) => {
    notifier.send({ to: memberId, kind: "offer", expiresAt });
    return { memberId, madeAt: now, accepted: false };
  });
}

/** Sorts offers into those that stand and those that ran out, and tells each member whose ran out. */
export function expireOffers(
  offers: Offer[],
  now: string,
  notifier: Notifier,
): { kept: Offer[]; expired: Offer[] } {
  const expired = offers.filter((offer) => hasExpired(offer, now));
  for (const offer of expired) notifier.send({ to: offer.memberId, kind: "expired" });
  return { kept: offers.filter((offer) => !expired.includes(offer)), expired };
}

function hasExpired(offer: Offer, now: string): boolean {
  return Date.parse(now) - Date.parse(offer.madeAt) > OFFER_LASTS_MS;
}
