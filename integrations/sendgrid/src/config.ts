import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['global', 'eu'])
        .default('global')
        .describe('SendGrid API region. Use "eu" for EU regional subusers.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
