import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseCurrency: {
      schema: z
        .string()
        .default('EUR')
        .describe(
          'Default base currency for exchange rates (e.g., EUR, USD). Changing the base currency requires a paid Fixer plan.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
