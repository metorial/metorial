import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseCurrency: z
      .string()
      .default('EUR')
      .describe(
        'Default base currency for exchange rates (e.g., EUR, USD). Changing the base currency requires a paid Fixer plan.'
      )
  })
);
