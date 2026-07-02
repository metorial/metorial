import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    zip: z
      .string()
      .optional()
      .describe(
        'Default German postal code (Postleitzahl) for location-specific queries. 5 digits, e.g. "69168".'
      )
  })
);
