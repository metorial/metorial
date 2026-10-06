import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .optional()
      .describe(
        'Legacy saved account selection. Prefer calling list_accounts and passing accountId with each account operation.'
      )
  })
);
