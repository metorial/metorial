import { z } from 'zod';

export let accountIdSchema = z
  .string()
  .regex(/^\d+$/)
  .optional()
  .describe(
    'Basecamp account ID. Call list_accounts to discover authorized account IDs. Required unless this connection already has a saved account ID.'
  );
