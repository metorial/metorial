import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['auto', 'eu', 'uk', 'us', 'ca', 'as', 'au'])
      .default('auto')
      .describe(
        'API region for processing. Use "auto" for automatic GEO DNS routing, or select a specific region (e.g., "eu" for GDPR compliance).'
      )
  })
);
