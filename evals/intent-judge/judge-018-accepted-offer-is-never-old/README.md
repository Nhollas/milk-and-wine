# The accepted offer is an hour old

B9 says an accepted offer is kept "however old". In both planted tests the accepted offer was made an hour before it's checked, so it would be kept whether or not it was accepted, and code that expires accepted offers after 24 hours passes.

The judge should report that the setup can't show "however old".

Also fair to report, each as something the setup can't show:

- "An accepted offer": an hour-old offer is kept whether or not it was accepted.
- "Keeps it" and "sends no message": the same gap seen from the Then. Neither assertion would change if accepting an offer did nothing.

Tricky because both tests say "however old" in their titles, and both assertions are what the scenario asks for. Only the age of the offer is wrong, and it takes two timestamps to see it.
