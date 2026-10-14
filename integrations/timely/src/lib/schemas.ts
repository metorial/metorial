import { z } from 'zod';

export let accountIdSchema = z
  .string()
  .optional()
  .describe(
    'Account/workspace ID. Call list_accounts to discover authorized workspace IDs. May be omitted when you have one workspace or an existing connection has a saved workspace ID.'
  );
