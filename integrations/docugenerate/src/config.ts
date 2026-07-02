import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu', 'au'])
      .default('us')
      .describe(
        'Processing region for templates and documents. Use "eu" for GDPR compliance or "au" for Australia-based processing.'
      )
  })
);
