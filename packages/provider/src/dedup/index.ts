import { createHash } from 'crypto';
import { z } from 'zod';

/** An event a poller already reported, saved so an overlapping read can skip it. */
export let seenEntrySchema = z.object({ key: z.string().min(1), at: z.number().finite() });
export type SeenEntry = z.infer<typeof seenEntrySchema>;

/** A short stable key for an idempotency key, so remembered events cost little state. */
export let seenEntryKey = (idempotencyKey: string) =>
  createHash('sha256').update(idempotencyKey).digest('base64url').slice(0, 16);

/** Keeps entries at or after `cutoff` (or `retain`), newest first, at most `maxEntries`. */
export let pruneSeenEntries = (
  entries: Iterable<SeenEntry & { retain?: boolean }>,
  options: { cutoff: number; maxEntries: number; onOverflow?: (dropped: number) => void }
): SeenEntry[] => {
  let kept: SeenEntry[] = [];
  for (let { key, at, retain } of entries) {
    if (retain || at >= options.cutoff) kept.push({ key, at });
  }
  kept.sort((a, b) => b.at - a.at || (a.key < b.key ? -1 : 1));
  if (kept.length <= options.maxEntries) return kept;
  options.onOverflow?.(kept.length - options.maxEntries);
  return kept.slice(0, options.maxEntries);
};
