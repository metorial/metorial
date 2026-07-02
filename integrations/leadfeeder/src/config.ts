import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .optional()
      .describe(
        'Leadfeeder account ID. If not provided, the first available account will be used.'
      )
  })
);
