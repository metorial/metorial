import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production', 'sandbox'])
      .default('sandbox')
      .describe(
        'API environment. Use "sandbox" for testing (watermarked output) or "production" for live usage.'
      )
  })
);
