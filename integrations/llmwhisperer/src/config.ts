import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us-central', 'eu-west'])
        .default('us-central')
        .describe('API region. Determines which regional endpoint to use.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
