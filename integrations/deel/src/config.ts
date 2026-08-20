import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production', 'sandbox'])
        .default('production')
        .describe('Deel environment to connect to'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
