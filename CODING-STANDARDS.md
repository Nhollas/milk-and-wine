# Coding standards

These are defaults, not laws. When a case genuinely doesn't fit, deviate and say why in the MR.

## Naming

- Use the name the ecosystem already uses (`logger.info(...)`, `app.request(...)`) over one we invent.
- Name a value for what it holds and a function for what it returns or does (`httpInterceptor`, `filesUnder(directory)`, `sendOverdueReminders(...)`).
- If the only honest name needs "and" or a vague verb like `handle`, split the code.

## Design

- If a test needs module mocks, real waits or global state, change the code, not the test.

## Tests

- A test file's level says what stands in for the systems we don't own. A service test uses a fake: a small working implementation of one of our clients, such as `fakeCatalogueClient()`. An integration test runs our client against MSW handlers for the external API's endpoints, never the real system, and never checks that its owners agree. A system test uses the same handlers around the whole service. Call them fakes and handlers, not mocks or stubs.
- Write out what a test sends and expects: method, path and body; status, response body and rows. Build neither from the code under test (route constants, response types, generated clients).
- A test body has no loops or branches, so a reader can see what it does without tracing code. Cases that differ only in data can share one body through `test.each`, with each case's inputs and expected outcome written out in its table.
- Order a test as setup, call, assertions, with a blank line between each. A call with one assertion can sit inside it. Setup goes through fixtures named for what they are (`fakeCatalogue.addCopies(...)`, `clock.setToday(...)`) or `httpInterceptor.use(...)`.
- Name a response for the request that sent it, ending in `Response` (`secondLendResponse`, `notJsonResponse`).
- Every value a test asserts on comes from the test body, including the scenario's Given. Helpers may build values but not invent ones the test asserts.
- Assert on outcomes: responses, return values, messages sent, rows stored. Assert on a request only when it is the outcome, such as a one-way notification ([MSW: avoid request assertions](https://mswjs.io/docs/best-practices/avoid-request-assertions)).
