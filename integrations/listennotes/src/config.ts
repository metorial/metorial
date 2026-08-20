import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .enum([
          'https://listen-api.listennotes.com/api/v2',
          'https://listen-api-test.listennotes.com/api/v2'
        ])
        .default('https://listen-api.listennotes.com/api/v2')
        .describe('API base URL. Use the test URL for development with mock data.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
