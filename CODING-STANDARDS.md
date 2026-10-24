# Coding standards

These are defaults, not laws. When a case genuinely doesn't fit, deviate and say why in the MR.

## Naming

- Use the name the ecosystem already uses (`logger.info(...)`, `app.request(...)`) over one we invent.
- Name a value for what it holds and a function for what it returns or does (`httpInterceptor`, `filesUnder(directory)`, `sendOverdueReminders(...)`).
- If the only honest name needs "and" or a vague verb like `handle`, split the code.

## Design

- If a test needs module mocks, real waits or global state, change the code, not the test.

## Tests

- Write out what a test sends and expects: method, path and body; status, response body and rows. Build neither from the code under test (route constants, response types, generated clients).
- Write each case out, even when it repeats. A test has no loops or branches.
- Order a test as setup, call, assertions, with a blank line between each. A call with one assertion can sit inside it. Setup goes through fixtures named for what they are (`fakeCatalogue.addCopies(...)`, `clock.setToday(...)`) or `httpInterceptor.use(...)`.
- Name a response for the request that sent it, ending in `Response` (`secondLendResponse`, `notJsonResponse`).
- Every value a test asserts on comes from the test body, including the row's Given. Helpers may build values but not invent ones the test asserts.
- Assert on outcomes: responses, return values, messages sent, rows stored. Assert on a request only when it is the outcome, such as a one-way notification ([MSW: avoid request assertions](https://mswjs.io/docs/best-practices/avoid-request-assertions)).
