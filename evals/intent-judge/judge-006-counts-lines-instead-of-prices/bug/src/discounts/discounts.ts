export type Order = { placedOn: string; lines: { pence: number }[] };

export type PricedOrder = { lines: number[]; total: number };

export function priceOrder(order: Order, today: string): PricedOrder {
  const discount = 0.1;
  const lines = order.lines.map(({ pence }) => Math.floor(pence * (1 - discount)));
  return { lines, total: lines.reduce((sum, pence) => sum + pence, 0) };
}
