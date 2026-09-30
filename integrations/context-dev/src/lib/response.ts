import { z } from 'zod';

export const keyMetadataSchema = z
  .object({
    credits_consumed: z.number().int(),
    credits_remaining: z.number().int()
  })
  .passthrough();

export const cacheMetadataSchema = z.object({
  status: z.enum(['hit', 'miss', 'zdr']),
  age_ms: z.number().int().nonnegative()
});

export const responseMetadata = {
  key_metadata: keyMetadataSchema.optional(),
  request_id: z.string()
};
