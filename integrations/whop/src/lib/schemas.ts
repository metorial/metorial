import { z } from 'zod';

export let companyIdSchema = z
  .string()
  .optional()
  .describe(
    'Company/account ID. Call list_accounts to discover authorized accounts and pass accountId here. Uses config companyId if not provided.'
  );
