# Coding standards

The standards this repo holds code and tests to. [AGENTS.md](AGENTS.md) covers specs, rows and
test placement; this file covers how code and tests are shaped and named.

These are defaults, not laws. When a case genuinely doesn't fit, deviate and say why in the MR.

Each standard is tagged with how it's upheld:

- **enforced**: a tool fails the build when it's broken.
- **checkable**: a tool could enforce it deterministically but doesn't yet. Prefer turning these
  into **enforced**.
- **review**: needs judgement; upheld in review.

## Naming

- Prefer the name the wider ecosystem already uses over one we invent: `logger` with
  `logger.info(...)`, `XClient` for code that calls another system's API, `handlers` for MSW
  request handlers. A newcomer should recognise the name before opening the file. **review**
- Spell names correctly: `httpInterceptor`, not `httpIntercepter`. **review**
- Name a module that holds a thing with a noun (`http-interceptor.ts`, `httpInterceptor`), and a
  function for what it returns (`copyLookupHandler(copies)`, `lendForLoanId(...)`). **review**
- Name code that calls an external system `<System>Client`, its factory `create<System>Client`, and
  its file `<system>-client.ts`. **checkable**
- Don't use `Service` in code names. "Service" already means this repo and a test level
  ([GLOSSARY.md](GLOSSARY.md)). **checkable**
- Name support files `<subject>.<role>.ts`, where the role says what kind of file it is. **checkable**
  - `.setup.ts`: a Vitest setup file, named after what it sets up (`http-interceptor.setup.ts`),
    never `vitest.setup.ts`. A project can have several.
  - `.fixtures.ts`: an extended `test`, named for the tests that use it (`service.fixtures.ts`,
    `system.fixtures.ts`) or the object it provides (`repo.fixtures.ts`).
  - `.handlers.ts`: MSW handlers for one external API (`catalogue-api.handlers.ts`).
- Never name a file only for its kind: no bare `fixtures.ts`, `helpers.ts` or `utils.ts`. Two files
  with the same generic name but different contents can't be told apart in an import, a search or
  an editor tab. **checkable**

## TypeScript

- Narrow a string to the values it can really take. Derive the union from a single `as const`
  list instead of repeating the values: `type Level = (typeof levels)[number]`. **review**
- Check object literals that must match a library's type with `satisfies <Type>`, not an
  annotation, so a misspelt key fails `tsc` and the literal types survive. **review**
- Put a module's main export first and its helpers, types and constants below it, when they can
  be function declarations or types (both are hoisted). Don't bend code to get this order: a value
  built at load time, such as `export default defineConfig({...})`, goes last. **review**

## Dependencies and testability

- Pass collaborators in; don't construct them inside. A function that needs a client, clock,
  logger or retry policy takes it as an option. Only `src/**/main.ts` builds the real ones.
  **checkable**: only `main.ts` and tests may call `create*Client(...)`.
- Call `fetch` only from a `*-client.ts` module, so every external call sits behind an interface
  the rest of the code can be tested without. **checkable**
- Don't put timings in module constants that tests can't change. Accept them as options, default
  them to the spec's numbers, and pin the defaults in one test (see `DEFAULT_RETRY_POLICY`). No
  test should wait in real time for a promise it could prove with a smaller value. **review**
- When a test is hard to write, treat it as a design problem in the code first, before reaching
  for heavier test machinery. **review**

## Test configuration

- Keep one `vitest.config.ts`. Each test level is a Vitest project with its own label colour, so a
  run shows at a glance which level each test belongs to. **enforced** by `vitest.config.ts`
- A test file's level, and so its project, comes only from its name (`*.<level>.test.ts`). A file
  with no level runs in `unit`, so every test file runs somewhere. **enforced** by
  `vitest.config.ts`
- `pnpm test` runs every project except `smoke`; `pnpm test:smoke` runs `smoke` alone. Run one
  level with `pnpm vitest --project <level>`. **enforced** by `package.json`

## Tests

- Reading a test top to bottom, it must be obvious which lines are setup and which call the code
  under test. Bare function calls in a test should be the code under test (`runCheck(...)`,
  `addDays(...)`). Setup goes through a fixture object (`repo.writeSpec(...)`,
  `library.lendForLoanId(...)`, `catalogueClient.addCopies(...)`) or a call whose receiver names
  it as setup (`httpInterceptor.use(...)`). **review**
- Put helpers that seed or read state on the fixture object, not loose in a test file. Raw SQL
  belongs in `library.ts` (`library.loanCount()`), not in tests. **review**
- Keep support code thin. A helper earns its place by removing mechanics that several tests repeat
  (`openLibrary`, `repo.writeSpec`). Don't let one hide what kind of test this is, such as
  wrapping `httpInterceptor.use(...)` in a system test, and don't let one hold clever logic. When
  a helper starts to look like product code, pull it back into the tests. **review**
- A fixture cleans up everything it creates, with `onCleanup`: databases, temporary folders,
  servers. **review**
- Delete helper options no test uses. **review**
- Every value a test asserts on must come from the test itself: its own arguments, setup lines or
  inline responses. Helpers may build values but must not make up any that the test later
  asserts. **review**
- Keep the row's "given" in the test body: the copies that exist, today's date, which sends are
  refused. Set today explicitly whenever the test checks dates. **review**
- Fixtures provide objects (`library`, `catalogueClient`, `notificationsClient`), never data or
  HTTP interception. Tests seed data and install handlers themselves. **review**
- Give each kind of test its own fixtures module: `service.fixtures.ts` wires the library to
  in-memory fakes, and `system.fixtures.ts` wires it to the real clients. Build the shared object
  once (`library.ts`) and let each fixtures module decide what to wire it to. **review**
- Export one `test` per `.fixtures.ts` module, and import it by that name, from a `.fixtures.ts`
  module or from `vitest`. `spec:check` finds
  tests by the text `test("…")`. **enforced** by `spec:check`
- `test.only` never reaches `main`. **enforced** by `allowOnly: false`

## Test doubles and HTTP

- Use the test-double words precisely. A **fake** is a small working implementation
  (`fake-catalogue-client.ts`). MSW request handlers are **handlers**
  (`catalogue-api.handlers.ts`), not fakes or mocks. **review**
- Name a fake of one of our clients `fake-<system>-client.ts`, exporting `fake<System>Client()`.
  Put MSW handlers, path constants and response builders for their API in
  `<system>-api.handlers.ts`. **checkable**
- Service tests use in-memory fakes of our clients and make no HTTP requests. Only integration
  tests (one client against a stand-in API) and system tests (end to end) use MSW.
  **enforced** in part: the service project loads the interceptor, so any request without a
  handler fails. **checkable**: `msw` and `httpInterceptor` are imported only by
  `*.integration.test.ts`, `*.system.test.ts` and `tests/support/`.
- Handler factories return a handler; they never install it. Tests call
  `httpInterceptor.use(...)` themselves, so a reader sees the interception in the test.
  **checkable**: `httpInterceptor.use` appears only in `*.test.ts` and `*.setup.ts`.
- Define each API's URL and path patterns once, in its handlers module, and import them. **review**
- Any request no handler matches fails the test. **enforced** by `onUnhandledRequest: "error"`
- Assert on how the code reacts to responses, not on the requests it made. Describe sequences
  with generator resolvers (`function* () { yield …; return …; }`) or `{ once: true }` handlers.
  To prove "doesn't retry", make the next response a success, so a retry would change the
  outcome. **review**
- Record requests only where the request is the outcome: a one-way send such as a notification,
  or an integration test that checks a client's request shape. Then record into an array the test
  owns and assert with `toEqual`. **review**
