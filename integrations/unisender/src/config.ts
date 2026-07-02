import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    locale: z
      .enum(['en', 'ru'])
      .default('en')
      .describe('API response language (en for English, ru for Russian)')
  })
);
