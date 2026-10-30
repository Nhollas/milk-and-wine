# Discounts

Prices an order's lines in pence, taking a loyalty discount off orders that weren't placed today.

| Scope          |                   |
| -------------- | ----------------- |
| **Owns**       | Pricing an order. |
| **Depends on** | Nothing.          |
| **Excluded**   | Tax and delivery. |

## Behaviour

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | An order with several lines, placed before today | It's priced | Takes 10% off every line, rounded down to the penny, and totals the lines | service |
| B2 | An order placed today | It's priced | Takes nothing off any line | service |
| B3 | An order with no lines | It's priced | Has no priced lines and totals 0 | service |

**Why**

- **B1:** Rounding down means the shop never charges a fraction of a penny more than the discount allows.
