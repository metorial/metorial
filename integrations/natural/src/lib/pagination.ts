import { z } from 'zod';
import { isRecord } from './envelopes';

export const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .describe('Maximum number of records to return. Natural supports 1-100.');

export const cursorSchema = z
  .string()
  .optional()
  .describe('Pagination cursor returned by a previous Natural list response.');

export const paginationInputFields = {
  limit: limitSchema.default(50),
  cursor: cursorSchema
};

export const customerPaginationInputFields = {
  limit: limitSchema.default(20),
  cursor: cursorSchema
};

export const paginationOutputSchema = z.object({
  hasMore: z.boolean(),
  nextCursor: z.string().nullable()
});

export const paginationFrom = (envelope: unknown) => {
  const meta = isRecord(envelope) && isRecord(envelope.meta) ? envelope.meta : {};
  const pagination = isRecord(meta.pagination) ? meta.pagination : {};

  return {
    hasMore: pagination.hasMore === true,
    nextCursor: typeof pagination.nextCursor === 'string' ? pagination.nextCursor : null
  };
};
