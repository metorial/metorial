import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['sandbox', 'production'])
      .default('production')
      .describe('PayPal environment to use. Use sandbox for testing.')
  })
);
