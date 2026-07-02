import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production', 'sandbox'])
      .default('production')
      .describe('Ramp API environment. Use sandbox for testing, production for live data.')
  })
);
