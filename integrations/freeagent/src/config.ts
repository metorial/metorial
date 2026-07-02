import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production', 'sandbox'])
      .default('production')
      .describe(
        'Use "sandbox" for testing with the FreeAgent sandbox API, or "production" for live data.'
      )
  })
);
