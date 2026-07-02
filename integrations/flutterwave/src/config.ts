import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['sandbox', 'production'])
      .default('production')
      .describe(
        'Flutterwave environment to use. Sandbox for testing, production for live transactions.'
      )
  })
);
