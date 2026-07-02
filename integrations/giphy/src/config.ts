import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    rating: z
      .enum(['g', 'pg', 'pg-13', 'r'])
      .optional()
      .describe('Content rating filter to apply globally (g, pg, pg-13, r)'),
    language: z
      .string()
      .optional()
      .describe(
        'Default language for search results (ISO 639-1 two-letter code, e.g. "en", "es", "fr")'
      )
  })
);
