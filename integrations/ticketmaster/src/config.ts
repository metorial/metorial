import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    countryCode: z
      .string()
      .optional()
      .describe('Default ISO country code to filter results (e.g., US, CA, GB, AU, MX, NZ)'),
    locale: z
      .string()
      .optional()
      .describe('Locale for localized content (e.g., en-us, en-gb, fr-ca)')
  })
);
