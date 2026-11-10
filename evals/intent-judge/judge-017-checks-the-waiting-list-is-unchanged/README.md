# The test checks the waiting list is left as it was

B3 says every waiting member is offered one place. The planted test also asserts that the waiting list passed in is unchanged afterwards, which no scenario asks for: the spec leaves joining and leaving the waitlist to something else, and says nothing of what offering does to the list.

The judge should report the extra assertion as something the scenario doesn't say.

Tricky because the assertion reads like good hygiene and uses the same values as the setup, so it's easy to take for part of the Given.
