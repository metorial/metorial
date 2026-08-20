import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production', 'sandbox'])
        .default('production')
        .describe('The Breathe HR environment to use'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
