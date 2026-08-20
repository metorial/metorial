import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    defaultDatabase: {
      schema: z
        .string()
        .optional()
        .describe('Default database to use for queries when not explicitly specified'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    queryTimeout: {
      schema: z.number().default(30000).describe('Query timeout in milliseconds'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    maxRows: {
      schema: z
        .number()
        .default(1000)
        .describe('Maximum number of rows to return from queries by default'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
