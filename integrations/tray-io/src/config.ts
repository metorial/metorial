import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu', 'apac'])
        .default('us')
        .describe('Tray.io region. Determines the API endpoint used for all requests.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
