import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    dataCenter: {
      schema: z
        .enum(['us-west-1', 'us-east-4', 'eu-central-1'])
        .default('us-west-1')
        .describe('Sauce Labs data center region for API requests'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
