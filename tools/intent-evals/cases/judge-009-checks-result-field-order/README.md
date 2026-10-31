# The test checks which fields the result has, and their order

B3 says the priced order has no lines and totals 0. The planted test also asserts the result's keys are exactly `lines` then `total`, which no scenario asks for.

The judge should report the extra assertion as something the scenario doesn't say.

Easy because the extra line checks shape, not price, and sits apart from the real assertion.
