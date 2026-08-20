import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseCurrency: {
      schema: z
        .string()
        .default('USD')
        .describe(
          'Default base currency code (e.g., USD, EUR, GBP) used when no base currency is specified in requests'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
