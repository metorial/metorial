import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production', 'sandbox'])
        .default('production')
        .describe('Persona environment to use. Determines the expected API key prefix.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
