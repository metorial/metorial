import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    language: z
      .enum(['en', 'fr'])
      .default('en')
      .describe('Language for enrichment results (English or French)')
  })
);
