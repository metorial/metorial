import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .optional()
      .describe(
        'Optional default account ID. Call get_accounts to discover accessible accounts. If omitted, the first accessible account is used.'
      )
  })
);
