import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseCurrency: z
      .string()
      .default('USD')
      .describe(
        'Default base currency code (e.g., USD, EUR, GBP) used when no base currency is specified in requests'
      )
  })
);
