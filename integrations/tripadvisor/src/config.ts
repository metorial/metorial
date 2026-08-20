import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    language: {
      schema: z
        .string()
        .default('en')
        .describe('Language code for API responses (e.g., "en", "fr", "de", "ja")'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    currency: {
      schema: z
        .string()
        .default('USD')
        .describe('ISO 4217 currency code for pricing data (e.g., "USD", "EUR", "GBP")'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
