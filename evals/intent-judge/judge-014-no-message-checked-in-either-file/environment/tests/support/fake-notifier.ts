import type { Message, Notifier } from "../../src/waitlist/waitlist.ts";

/** A notifier that sends nothing, and keeps every message it was given in order. */
export function fakeNotifier(): Notifier & { sent: Message[] } {
  const sent: Message[] = [];
  return {
    sent,
    send(message) {
      sent.push(message);
    },
  };
}
