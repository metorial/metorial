import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .optional()
      .describe(
        'Client account ID for agency partners managing multiple accounts. Use list_clients to discover IDs. Leave empty if not using agency features.'
      )
  })
);
