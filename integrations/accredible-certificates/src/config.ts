import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production_us', 'production_eu', 'sandbox'])
        .default('production_us')
        .describe('Accredible API environment to use'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
