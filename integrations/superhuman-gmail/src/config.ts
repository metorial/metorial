import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    userId: z
      .string()
      .default('me')
      .describe(
        'Gmail user ID. Use "me" for the authenticated user, or a mailbox email for delegated access.'
      )
  })
);
