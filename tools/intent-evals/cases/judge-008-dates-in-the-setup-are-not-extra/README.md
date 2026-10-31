# Dates in the setup are the Given, not an added requirement

B3 says an order with no lines prices to nothing. Its test places the order the day before it is priced. The scenario never mentions dates, but the test checks nothing about them: they are only the setup an order needs. The test is right.

The judge should report nothing.

Tricky because a judge looking for anything the scenario doesn't say may call the dates an added requirement, when only an assertion can add one.
