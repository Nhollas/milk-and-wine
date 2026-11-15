# Waitlist

Offers freed places in a class to the members waiting for it, and expires the offers nobody takes up.

| Scope          |                                                       |
| -------------- | ----------------------------------------------------- |
| **Owns**       | Offering freed places, and expiring offers.           |
| **Depends on** | A notifier, which sends a member a message.           |
| **Excluded**   | Joining and leaving the waitlist. Accepting an offer. |

## Behaviour

### Offering places

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | Three waiting members and 2 freed places | Places are offered | Offers a place to each of the 2 who joined earliest, in the order they joined, and none to the third | unit |
| B2 | Two waiting members who joined at the same moment, and 1 freed place | Places are offered | Offers it to the member whose ID sorts first | unit |
| B3 | More freed places than waiting members | Places are offered | Offers every waiting member one place, and no member more than one | unit |
| B4 | A waiting member and a freed place | Places are offered | Sends the member an "offer" message that says the offer expires 24 hours from now | unit |
| B5 | No one waiting | Places are offered | Makes no offer and sends no message | unit |
| B6 | A waiting member holding an offer that hasn't expired | Places are offered | Skips them, and offers the place to the next member | unit |

### Expiring offers

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B7 | An offer made 24 hours ago or less, not accepted | Offers are expired | Keeps it | unit |
| B8 | An offer made more than 24 hours ago, not accepted | Offers are expired | Expires it and sends the member an "expired" message | unit |
| B9 | An accepted offer, however old | Offers are expired | Keeps it and sends no message | unit |

**Why**

- **B2:** Two members can join in the same request, and the same one must win every time places are offered.
- **B7:** A member told they have 24 hours has all of them.
