import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    defaultSchema: z
      .string()
      .default('public')
      .describe('Default schema to use for queries when not explicitly specified'),
    queryTimeout: z.number().default(30000).describe('Query timeout in milliseconds'),
    maxRows: z
      .number()
      .default(1000)
      .describe('Maximum number of rows to return from queries by default')
  })
);
