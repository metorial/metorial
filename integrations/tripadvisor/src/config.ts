import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    language: z
      .string()
      .default('en')
      .describe('Language code for API responses (e.g., "en", "fr", "de", "ja")'),
    currency: z
      .string()
      .default('USD')
      .describe('ISO 4217 currency code for pricing data (e.g., "USD", "EUR", "GBP")')
  })
);
