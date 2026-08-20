import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe('PagerDuty account region (US or EU)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
