import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'uk'])
        .default('us')
        .describe('API region. US uses api-us1.stannp.com, UK/EU uses dash.stannp.com'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
