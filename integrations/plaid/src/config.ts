import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['sandbox', 'production'])
        .default('sandbox')
        .describe('Plaid API environment to use'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
