import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production_us', 'production_eu', 'sandbox'])
      .default('production_us')
      .describe('Accredible API environment to use')
  })
);
