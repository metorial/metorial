import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['US', 'EU'])
      .default('US')
      .describe(
        'Data residency region. US uses amplitude.com, EU uses analytics.eu.amplitude.com.'
      )
  })
);
