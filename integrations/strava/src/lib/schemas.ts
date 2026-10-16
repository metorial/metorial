import { z } from 'zod';

// Decimal strings preserve Strava int64 IDs beyond JavaScript's safe integer range.
export let exactIdSchema = z.union([
  z.string().regex(/^[1-9]\d*$/),
  z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
]);
