import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    signingSecret: z
      .string()
      .optional()
      .describe(
        'Signing Secret for a customer-owned Slack app (Basic Information → App Credentials); enables request verification'
      )
  })
);
