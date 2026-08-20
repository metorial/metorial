import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu', 'ca', 'au', 'in'])
        .default('us')
        .describe('The Svix API region. Determines the base URL for API requests.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
