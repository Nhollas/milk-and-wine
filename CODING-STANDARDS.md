# Coding standards

These are defaults, not laws. When a case genuinely doesn't fit, deviate and say why in the MR.

## Naming

- Prefer the name the wider ecosystem already uses over one we invent: `logger` with `logger.info(...)`, `XClient` for code that calls another system's API, `handlers` for MSW request handlers. A newcomer should recognise the name before opening the file.
- Spell names correctly: `httpInterceptor`, not `httpIntercepter`.
- Name things for what they return or hold, so a reader can predict it without opening them: a module that holds a thing gets a noun (`http-interceptor.ts`, `httpInterceptor`), a function gets what it returns (`filesUnder(directory)`, `copyLookupHandler(copies)`). If no plain name fits, the code is doing two jobs: split it.

## TypeScript

- Narrow a string to the values it can really take. Derive the union from a single `as const` list instead of repeating the values: `type Level = (typeof levels)[number]`.
- Check object literals that must match a library's type with `satisfies <Type>`, not an annotation, so a misspelt key fails the typecheck and the literal types survive.
- Put a module's main export first and its helpers, types and constants below it, when they can be function declarations or types (both are hoisted). Don't bend code to get this order: a value built at load time, such as `export default defineConfig({...})`, goes last.

## Dependencies and testability

- Pass collaborators in; don't construct them inside. A function that needs a client, clock, logger or retry policy takes it as an option. Only `src/**/main.ts` builds the real ones.
- Don't put timings in module constants that tests can't change. Accept them as options, default them to the spec's numbers, and pin the defaults in one test (see `DEFAULT_RETRY_POLICY`). No test should wait in real time for a promise it could prove with a smaller value.
- When a test is hard to write, treat it as a design problem in the code first, before reaching for heavier test machinery.

## Tests

- Reading a test top to bottom, it must be obvious which lines are setup and which call the code under test. Bare function calls in a test should be the code under test (`runCheck(...)`, `addDays(...)`). Setup goes through a fixture object (`repo.writeSpec(...)`, `library.lendForLoanId(...)`, `catalogueClient.addCopies(...)`) or a call whose receiver names it as setup (`httpInterceptor.use(...)`).
- Put helpers that seed or read state on the fixture object, not loose in a test file.
- Keep support code thin. A helper earns its place by removing mechanics that several tests repeat (`openLibrary`, `repo.writeSpec`). Don't let one hide what kind of test this is, such as wrapping `httpInterceptor.use(...)` in a system test, and don't let one hold clever logic. When a helper starts to look like product code, pull it back into the tests.
- A fixture cleans up everything it creates, with `onCleanup`: databases, temporary folders, servers.
- Delete helper options no test uses.
- Every value a test asserts on must come from the test itself: its own arguments, setup lines or inline responses. Helpers may build values but must not make up any that the test later asserts.
- Keep the row's "given" in the test body: the copies that exist, today's date, which sends are refused. Set today explicitly whenever the test checks dates.
- Fixtures provide objects (`library`, `catalogueClient`, `notificationsClient`), never data or HTTP interception. Tests seed data and install handlers themselves.
- Give each kind of test its own fixtures module: `service.fixtures.ts` wires the library to in-memory fakes, and `system.fixtures.ts` wires it to the real clients. Build the shared object once (`library.ts`) and let each fixtures module decide what to wire it to.

## Test doubles and HTTP

- Use the test-double words precisely. A **fake** is a small working implementation (`fake-catalogue-client.ts`). MSW request handlers are **handlers** (`catalogue-api.handlers.ts`), not fakes or mocks.
- Define each API's URL, path patterns and response builders once, in its handlers module, and import them.
- Assert on how the code reacts to responses, not on the requests it made. Describe sequences with generator resolvers (`function* () { yield …; return …; }`) or `{ once: true }` handlers. To prove "doesn't retry", make the next response a success, so a retry would change the outcome.
- Record requests only where the request is the outcome: a one-way send such as a notification, or an integration test that checks a client's request shape. Then record into an array the test owns and assert with `toEqual`.
