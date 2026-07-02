import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    market: z
      .string()
      .optional()
      .describe(
        'ISO 3166-1 alpha-2 country code for filtering content availability (e.g., "US", "GB", "DE")'
      )
  })
);
