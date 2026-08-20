import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production', 'sandbox'])
        .default('production')
        .describe('Ramp API environment. Use sandbox for testing, production for live data.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
