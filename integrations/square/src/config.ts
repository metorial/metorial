import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production', 'sandbox'])
        .default('production')
        .describe('Square API environment. Use sandbox for testing.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
