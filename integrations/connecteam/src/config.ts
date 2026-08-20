import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .enum(['https://api.connecteam.com', 'https://api-au.connecteam.com'])
        .default('https://api.connecteam.com')
        .describe('API base URL. Use the Australia URL for Australian accounts.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
