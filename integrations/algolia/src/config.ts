import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    analyticsRegion: {
      schema: z
        .enum(['us', 'de'])
        .default('us')
        .describe(
          'Analytics region for Analytics, A/B Testing, and Insights APIs. Check your Algolia dashboard under Infrastructure > Analytics.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
