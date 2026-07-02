import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    localityLanguage: z
      .string()
      .default('en')
      .describe(
        'Preferred language for locality names in ISO 639-1 format (e.g. "en", "es", "fr"). Defaults to "en".'
      )
  })
);
