import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    language: {
      schema: z
        .enum(['en', 'fr'])
        .default('en')
        .describe('Language for enrichment results (English or French)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
