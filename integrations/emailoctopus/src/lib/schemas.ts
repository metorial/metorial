import { z } from 'zod';

export let listIdSchema = z
  .string()
  .describe(
    'List ID. Call list_lists to discover authorized lists before selecting the target.'
  );
