# The message is checked in another file

B8 says an old offer expires and the member is sent an "expired" message. Its test in the main file checks the expiry, and its test in the messages file checks the message. The tests are right.

The judge should report nothing.

Tricky because a judge that stops at the first file with a B8 test reports the message as missed.
