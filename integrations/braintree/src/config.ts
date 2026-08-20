import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['sandbox', 'production'])
        .default('production')
        .describe('Braintree environment to use'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
