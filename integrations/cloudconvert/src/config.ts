import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production', 'sandbox'])
      .default('production')
      .describe(
        'API environment to use. Sandbox allows unlimited jobs without consuming credits but only processes whitelisted files.'
      )
  })
);
