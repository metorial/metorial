import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu'])
        .default('eu')
        .describe('New Relic data center region. US or EU.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    accountId: {
      schema: z.string().describe('New Relic Account ID. Required for most operations.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
