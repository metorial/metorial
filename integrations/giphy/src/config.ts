import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    rating: {
      schema: z
        .enum(['g', 'pg', 'pg-13', 'r'])
        .optional()
        .describe('Content rating filter to apply globally (g, pg, pg-13, r)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    language: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default language for search results (ISO 639-1 two-letter code, e.g. "en", "es", "fr")'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
