import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['sandbox', 'production'])
        .default('production')
        .describe('PayPal environment to use. Use sandbox for testing.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
