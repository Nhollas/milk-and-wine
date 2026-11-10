# The member holding an offer is last in line anyway

B6 says a member holding an offer is skipped. In the planted test the holder, ada, joined after ben, and there is 1 place, so ben gets it whether or not anyone is skipped. Code that never looks at who holds an offer passes.

The judge should report that the setup can't show the skip.

Also fair to report:

- "offers the place to the next member": ben is first in line, not next after a skipped member.

Hard because the assertion is exactly what the scenario asks for, and the order members joined in comes from `tests/support/waiting.ts`, not the test. The judge has to ask what the test would do if nobody were skipped.
