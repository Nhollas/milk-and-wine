# The test expects a discount on an order placed today

B2 says an order placed today has nothing taken off. The planted test expects 10% off it, the opposite, and the example's code fails it.

The judge should report that the test contradicts "takes nothing off".

Also fair to report:

- "totals them": the expected total is the sum of the discounted lines, not of the prices the scenario leaves alone.

Easy because the expected prices are plainly discounted, and the scenario says they shouldn't be.
