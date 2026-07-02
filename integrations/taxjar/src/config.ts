import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production', 'sandbox'])
      .default('production')
      .describe('API environment to use. Use sandbox for testing with stubbed responses.'),
    apiVersion: z
      .string()
      .optional()
      .describe(
        'API version date in YYYY-MM-DD format (e.g. 2022-01-24). If omitted, the account default is used.'
      )
  })
);
