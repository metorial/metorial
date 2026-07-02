import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    referenceCurrencyUuid: z
      .string()
      .optional()
      .describe(
        'UUID of the reference currency for price calculations (defaults to USD). Use the list_reference_currencies tool to find available currency UUIDs.'
      )
  })
);
