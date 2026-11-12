import { describe, expect, it, vi } from 'vitest';
import { pruneSeenEntries, seenEntryKey, seenEntrySchema } from './index';

describe('seen entries', () => {
  it('derives a short stable key', () => {
    let key = seenEntryKey('["account","event",1]');
    expect(key).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(seenEntryKey('["account","event",1]')).toBe(key);
    expect(seenEntryKey('["account","event",2]')).not.toBe(key);
    expect(seenEntrySchema.safeParse({ key, at: 1 }).success).toBe(true);
    expect(seenEntrySchema.safeParse({ key, at: Number.NaN }).success).toBe(false);
  });

  it('drops entries before the cutoff unless retained, newest first', () => {
    expect(
      pruneSeenEntries(
        [
          { key: 'old', at: 1 },
          { key: 'kept', at: 1, retain: true },
          { key: 'b', at: 5 },
          { key: 'a', at: 5 },
          { key: 'new', at: 9 }
        ],
        { cutoff: 5, maxEntries: 10 }
      )
    ).toEqual([
      { key: 'new', at: 9 },
      { key: 'a', at: 5 },
      { key: 'b', at: 5 },
      { key: 'kept', at: 1 }
    ]);
  });

  it('keeps the newest entries and reports the overflow', () => {
    let onOverflow = vi.fn();
    expect(
      pruneSeenEntries(
        [1, 2, 3, 4].map(at => ({ key: `k${at}`, at })),
        { cutoff: 0, maxEntries: 2, onOverflow }
      )
    ).toEqual([
      { key: 'k4', at: 4 },
      { key: 'k3', at: 3 }
    ]);
    expect(onOverflow).toHaveBeenCalledWith(2);
  });
});
