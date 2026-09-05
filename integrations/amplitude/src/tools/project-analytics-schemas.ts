import { z } from 'zod';
import { amplitudeIdSchema } from '../lib/analytics-client';

export const tags = { destructive: false, readOnly: true };
export const userIdInput = amplitudeIdSchema.describe(
  'Amplitude user ID. Call search_users to discover it.'
);
export const cursorInput = z
  .string()
  .min(1)
  .optional()
  .describe('Opaque nextCursor from the previous page. Pass it unchanged.');
export const fileSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  byteLength: z.number().int().nonnegative()
});
