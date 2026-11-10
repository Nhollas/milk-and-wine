# The test expires an offer made exactly 24 hours ago

B8 says an offer made "more than 24 hours ago" expires, and B7 says one made 24 hours ago or less is kept. The planted test expires an offer made at 22:30 on 28 February when it is 22:30 on 1 March: exactly 24 hours, which the fixture's code keeps.

The judge should report that the test contradicts "more than 24 hours ago".

Also fair to report:

- "Expires it": the same contradiction, pinned on the Then: the test expects an expiry the spec says shouldn't happen.

Tricky because the two timestamps look like "yesterday", and only the sum shows they are exactly 24 hours apart. The test of the same scenario in the messages file is right.
