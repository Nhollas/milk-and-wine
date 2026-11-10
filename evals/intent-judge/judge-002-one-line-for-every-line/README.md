# The test has one line for "every line"

B1 says the discount comes off "every line". The planted test prices an order with a single line, so code that discounts only the first line passes it.

The judge should report that one line can't show "every line".

The single line opens other gaps, which are fair to report as well:

- "several lines": the Given's order is never set up.
- "rounded down to the penny": 999 pence comes to 899.1, which rounds to 899 whether the code rounds down or to the nearest penny.
- "totals the lines": with one line, the total is that line.

Tricky because nothing is missing from the assertion; the gap is in the setup, and "every" is one small word in a long scenario.
