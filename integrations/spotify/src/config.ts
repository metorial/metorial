import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    market: {
      schema: z
        .string()
        .optional()
        .describe(
          'ISO 3166-1 alpha-2 country code for filtering content availability (e.g., "US", "GB", "DE")'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
