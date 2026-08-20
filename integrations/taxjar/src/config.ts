import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production', 'sandbox'])
        .default('production')
        .describe('API environment to use. Use sandbox for testing with stubbed responses.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    apiVersion: {
      schema: z
        .string()
        .optional()
        .describe(
          'API version date in YYYY-MM-DD format (e.g. 2022-01-24). If omitted, the account default is used.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
