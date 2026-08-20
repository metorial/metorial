import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu', 'us1', 'jpn', 'au'])
        .default('us')
        .describe('Pendo data center region: US, EU, US1, Japan, or Australia'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
