# Catalogue client

Asks the library's Catalogue API whether a copy of a book exists and can be lent, for [loans](../loans/spec.md).

| Scope |  |
| --- | --- |
| **Owns** | The request to the Catalogue API, reading its response, and retrying when it is unavailable. |
| **Depends on** | The [Catalogue API](../../docs/external/catalogue-api.md), which the catalogue team runs. |
| **Excluded** | Caching copies. Every lookup asks the API. |

## Behaviour

### Looking up a copy

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | The API answers `200` with `id`, `title` and `state` of `available` or `withdrawn` | The client looks up a copy | Sends `GET {CATALOGUE_URL}/copies/{copyId}` and returns the copy, available only when `state` is `available` | integration |
| B2 | The API answers `404` | The client looks up a copy | Returns "not found" without retrying | integration |
| B3 | The API answers `5xx`, the connection fails, or an attempt exceeds 2 seconds | The client looks up a copy | Makes 3 attempts in total, 100 ms apart, then returns "failed" | integration |
| B4 | The API answers `200` with a body that doesn't match B1, or a `4xx` other than `404` | The client looks up a copy | Returns "failed" without retrying | integration |
| B5 | The catalogue has issued a copy ID | Loans uses it as the copy's identity | No other copy in any library branch has that ID | dependency [Catalogue API: copy IDs](../../docs/external/catalogue-api.md#copy-ids) |

## Limitations

- A copy withdrawn from lending after it was lent stays on loan until it is returned.

## Open questions

None.
