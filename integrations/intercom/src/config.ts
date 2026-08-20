import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu', 'au'])
        .default('us')
        .describe('Intercom workspace region. Determines the API endpoint used for requests.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
