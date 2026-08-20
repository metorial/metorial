import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    instance: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe('OpsGenie instance region (US or EU)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
