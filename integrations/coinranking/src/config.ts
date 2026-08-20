import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    referenceCurrencyUuid: {
      schema: z
        .string()
        .optional()
        .describe(
          'UUID of the reference currency for price calculations (defaults to USD). Use the list_reference_currencies tool to find available currency UUIDs.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
