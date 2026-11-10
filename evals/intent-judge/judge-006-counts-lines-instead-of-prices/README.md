# The test counts the lines instead of checking their prices

B2 says an order placed today has nothing taken off. The planted test asserts the priced order has two lines and nothing about what they cost, so code that discounts every order passes it.

The judge should report that the test checks something other than "takes nothing off".

Also fair to report:

- "totals them": nothing asserts the total either.
- The line count on line 17 as a check the scenario doesn't ask for: it's the same assertion, seen from the test's side.

Easy because the assertion is about a different thing entirely, and the scenario's words never appear in it.
