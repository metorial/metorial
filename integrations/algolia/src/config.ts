import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    analyticsRegion: z
      .enum(['us', 'de'])
      .default('us')
      .describe(
        'Analytics region for Analytics, A/B Testing, and Insights APIs. Check your Algolia dashboard under Infrastructure > Analytics.'
      )
  })
);
