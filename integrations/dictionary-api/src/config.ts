import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    languageCode: z
      .string()
      .default('en')
      .describe(
        'Default language code for dictionary lookups. English uses "en"; availability of other codes depends on the provider.'
      )
  })
);
