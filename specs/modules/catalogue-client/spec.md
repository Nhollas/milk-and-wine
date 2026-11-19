# Catalogue client

Asks the library's Catalogue API whether a copy of a book exists and can be lent, for [loans](../loans/spec.md).

| Scope |  |
| --- | --- |
| **Owns** | The request to the Catalogue API, reading its response, and retrying when it is unavailable. |
| **Depends on** | The [Catalogue API](../../../docs/external/catalogue-api.md), which the catalogue team runs. |
| **Excluded** | Caching copies. Every lookup asks the API. |

## Behaviour

### A copy the API describes is returned, available only when its state is `available`

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | The API answers `200` with `id`, `title` and `state` of `available` or `withdrawn` | The client looks up a copy | Sends `GET {CATALOGUE_URL}/copies/{copyId}` and returns the copy, available only when `state` is `available` | integration |
| B2 | The API answers `404` | The client looks up a copy | Returns "not found" without retrying | integration |

### An unavailable API is tried 3 times in all

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B3 | The API answers `5xx` | The client looks up a copy | Makes 3 attempts in total, 100 ms apart, then returns "failed" | integration |
| B6 | The connection to the API fails | The client looks up a copy | Makes 3 attempts in total, 100 ms apart, then returns "failed" | integration |
| B7 | An attempt gets no answer within 2 seconds | The client looks up a copy | Makes 3 attempts in total, 100 ms apart, then returns "failed" | integration |

### An answer the client can't use fails at once

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B4 | The API answers `200` with a body that doesn't match B1 | The client looks up a copy | Returns "failed" without retrying | integration |
| B8 | The API answers a `4xx` other than `404` | The client looks up a copy | Returns "failed" without retrying | integration |

### A copy ID names one copy across every branch

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B5 | The catalogue has issued a copy ID | Loans uses it as the copy's identity | No other copy in any library branch has that ID | dependency [Catalogue API: copy IDs](../../../docs/external/catalogue-api.md#copy-ids) |

## Limitations

- A copy withdrawn from lending after it was lent stays on loan until it is returned.

## Open questions

None.
