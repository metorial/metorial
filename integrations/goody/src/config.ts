import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production', 'sandbox'])
      .default('production')
      .describe('Goody API environment to use')
  })
);
