# The waiting list is already in the order members joined

B1 says places go to the 2 members "who joined earliest". The planted test builds its waiting list with `waitingInTurn("cy", "ada", "ben")`, a support helper that has each member join a minute after the one before. The list is already in join order, so code that takes the first 2 of the list without looking at when anyone joined passes it.

The judge should report that the setup can't show who joined earliest.

Also fair to report:

- "in the order they joined": a list already in join order can't show the offers are put in that order either.

Tricky because nothing in the test file says when anyone joined. The judge has to read `tests/support/waiting.ts` to learn the list is sorted, then see what a sorted list can't show.
