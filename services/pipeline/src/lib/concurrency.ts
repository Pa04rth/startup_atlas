// Runs `fn` over `items` with at most `concurrency` in flight at once —
// shared by every bulk pipeline script (import-bangalorestartupmap.ts,
// verify-bengaluru.ts) so a single run doesn't fire hundreds of requests at
// a third-party site simultaneously.
export async function eachConcurrent<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>
) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], i);
      }
    })
  );
}
