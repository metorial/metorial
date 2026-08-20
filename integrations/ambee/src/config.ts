import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    language: {
      schema: z
        .string()
        .optional()
        .describe(
          'Language code for API responses (e.g., "en", "es", "fr"). Defaults to English if not specified.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    units: {
      schema: z
        .enum(['imperial', 'si'])
        .default('imperial')
        .describe('Unit system for weather data. "imperial" (default) or "si" for SI units.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
