import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    language: z
      .string()
      .optional()
      .describe(
        'Language code for API responses (e.g., "en", "es", "fr"). Defaults to English if not specified.'
      ),
    units: z
      .enum(['imperial', 'si'])
      .default('imperial')
      .describe('Unit system for weather data. "imperial" (default) or "si" for SI units.')
  })
);
