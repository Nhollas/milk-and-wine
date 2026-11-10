# Catalogue API

Run by the catalogue team. This page records the parts of their contract we rely on; their own documentation is the authority.

## Looking up a copy

`GET /copies/{copyId}` answers `200` with `{ "id", "title", "state" }`, where `state` is `available` or `withdrawn`, or `404` when no copy has that ID.

## Copy IDs

Copy IDs are issued centrally and are unique across every branch. An ID is never reused, even after its copy is withdrawn.
