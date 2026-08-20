import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    locale: {
      schema: z
        .enum(['en', 'ru'])
        .default('en')
        .describe('API response language (en for English, ru for Russian)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
