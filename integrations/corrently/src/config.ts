import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    zip: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default German postal code (Postleitzahl) for location-specific queries. 5 digits, e.g. "69168".'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
