import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe('The region to use for API requests. Use "eu" for EU data residency.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
