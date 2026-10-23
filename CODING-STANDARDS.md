# Coding standards

These are defaults, not laws. When a case genuinely doesn't fit, deviate and say why in the MR.

## Naming

- Prefer the name the wider ecosystem already uses over one we invent, such as `logger` with `logger.info(...)`. A newcomer should recognise the name before opening the file.
- Name things for what they return or hold, so a reader can predict it without opening them: a module that holds a thing gets a noun (`http-interceptor.ts`, `httpInterceptor`), a function gets what it returns (`filesUnder(directory)`, `copyLookupHandler(copies)`). If the only honest name needs "and" or a vague verb like `handle`, the code is doing two jobs: split it.

## Design

- Design code to be tested. If a test needs heavy machinery, such as module mocks, real waits or global state, change the code, not the test.

## Tests

- Reading a test top to bottom, it must be obvious which lines are setup and which call the code under test. Setup goes through a fixture object (`library.lendForLoanId(...)`, `catalogueClient.addCopies(...)`) or a call whose receiver names it as setup (`httpInterceptor.use(...)`). Bare function calls are the code under test.
- No mystery guests: every value a test asserts on comes from the test itself, and the row's "given" is in the test body (the copies that exist, today's date, which sends are refused). Helpers may build values but must not make up any that the test later asserts.
- Assert on observable behaviour (responses, return values, messages sent), not implementation (requests made, internal calls, call counts). A request counts as behaviour only when it's the outcome, such as a one-way notification. See MSW's [Avoid request assertions](https://mswjs.io/docs/best-practices/avoid-request-assertions).
