import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseCurrency: z
      .string()
      .default('EUR')
      .describe(
        'Default base currency for exchange rates (e.g., EUR, USD). Permitted base currencies depend on the subscription for the selected API host.'
      )
  })
);
