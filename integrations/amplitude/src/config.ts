import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['US', 'EU'])
        .default('US')
        .describe(
          'Data residency region. US uses amplitude.com, EU uses analytics.eu.amplitude.com.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
