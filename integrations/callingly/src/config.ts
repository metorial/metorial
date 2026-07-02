import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .optional()
      .describe(
        'Client account ID for agency partners managing multiple accounts. Leave empty if not using agency features.'
      )
  })
);
