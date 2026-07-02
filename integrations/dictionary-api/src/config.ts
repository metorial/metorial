import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    languageCode: z
      .string()
      .default('en')
      .describe(
        'Language code for dictionary lookups (e.g., "en" for English, "fr" for French)'
      )
  })
);
