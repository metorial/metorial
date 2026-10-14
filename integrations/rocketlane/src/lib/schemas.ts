import { z } from 'zod';

export let pageTokenSchema = z
  .string()
  .optional()
  .describe(
    'Continuation token from pagination.nextPageToken. Tokens expire after 15 minutes; omit offset when using a token.'
  );

export let paginationSchema = z
  .object({
    pageSize: z.number().optional(),
    hasMore: z.boolean().optional(),
    totalRecordCount: z.number().optional(),
    nextPageToken: z.string().nullable().optional()
  })
  .optional()
  .describe('Pagination metadata. Pass nextPageToken as pageToken to continue.');

export let fieldOptionColorSchema = z.enum([
  'RED',
  'YELLOW',
  'GREEN',
  'TEAL',
  'CYAN',
  'BLUE',
  'PURPLE',
  'MAGENTA',
  'GRAY',
  'COOL_GRAY'
]);

export type FieldOptionColor = z.infer<typeof fieldOptionColorSchema>;
