import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    language: z
      .enum(['en', 'de'])
      .optional()
      .default('en')
      .describe(
        'Preferred language for API messages and descriptions. Some metadata may remain untranslated.'
      )
  })
);
