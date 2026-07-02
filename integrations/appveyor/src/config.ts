import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountName: z
      .string()
      .describe(
        'AppVeyor account name. Required when using a v2 (user-level) API key to specify which account to target.'
      )
      .optional()
  })
);
