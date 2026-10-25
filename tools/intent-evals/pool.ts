/** Runs `work` on every item, at most `limit` at a time, and returns the results in order. */
export async function inPool<Item, Result>(
  items: Item[],
  limit: number,
  work: (item: Item) => Promise<Result>,
): Promise<Result[]> {
  const results: Result[] = [];
  const queue = items.entries();
  const worker = async () => {
    for (const [index, item] of queue) results[index] = await work(item);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
