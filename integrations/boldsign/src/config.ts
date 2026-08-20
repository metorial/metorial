import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe('API region. "us" uses api.boldsign.com, "eu" uses eu-api.boldsign.com'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
