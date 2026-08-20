import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe('Mailgun region where your domain is registered. US or EU.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
