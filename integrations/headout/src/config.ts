import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production', 'sandbox'])
      .default('production')
      .describe(
        'API environment. Production uses www.headout.com, sandbox uses sandbox.api.test-headout.com.'
      ),
    languageCode: z
      .enum(['EN', 'ES', 'FR', 'IT', 'DE', 'PT', 'NL'])
      .default('EN')
      .describe('Default language for API responses.'),
    currencyCode: z
      .string()
      .optional()
      .describe('Default ISO 4217 currency code for pricing (e.g., USD, EUR, GBP, AED).')
  })
);
