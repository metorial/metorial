import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    countryCode: {
      schema: z
        .string()
        .optional()
        .describe('Default ISO country code to filter results (e.g., US, CA, GB, AU, MX, NZ)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    locale: {
      schema: z
        .string()
        .optional()
        .describe('Locale for localized content (e.g., en-us, en-gb, fr-ca)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
