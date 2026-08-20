import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production', 'sandbox'])
        .default('production')
        .describe(
          'API environment to use. Sandbox allows unlimited jobs without consuming credits but only processes whitelisted files.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
