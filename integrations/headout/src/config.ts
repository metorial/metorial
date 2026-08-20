import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production', 'sandbox'])
        .default('production')
        .describe(
          'API environment. Production uses www.headout.com, sandbox uses sandbox.api.test-headout.com.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    languageCode: {
      schema: z
        .enum(['EN', 'ES', 'FR', 'IT', 'DE', 'PT', 'NL'])
        .default('EN')
        .describe('Default language for API responses.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    currencyCode: {
      schema: z
        .string()
        .optional()
        .describe('Default ISO 4217 currency code for pricing (e.g., USD, EUR, GBP, AED).'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
