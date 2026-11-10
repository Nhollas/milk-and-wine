# The test's prices never need rounding

B1 says every line is discounted "rounded down to the penny". The planted test prices lines of 1000 and 250 pence: 10% off each is a whole number, so the test passes whether the code rounds down, rounds up or never rounds.

The judge should report that the setup can't show the rounding.

Tricky because the assertion still names a discounted total, so the test looks complete. The judge has to work out that the numbers chosen never exercise the words.
