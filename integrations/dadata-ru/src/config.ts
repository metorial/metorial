import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    language: {
      schema: z
        .enum(['ru', 'en'])
        .default('ru')
        .describe('Default language for API responses'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
