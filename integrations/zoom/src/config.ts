import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    secretToken: z
      .string()
      .optional()
      .describe(
        'Zoom webhook Secret Token from the app Event Subscriptions settings; required for endpoint URL validation'
      )
  })
);
