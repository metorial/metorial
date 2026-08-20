import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    dataCenter: {
      schema: z
        .enum(['us', 'eu', 'jp', 'sg', 'au'])
        .default('us')
        .describe('Workato data center region for your workspace'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
