import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .enum([
        'https://listen-api.listennotes.com/api/v2',
        'https://listen-api-test.listennotes.com/api/v2'
      ])
      .default('https://listen-api.listennotes.com/api/v2')
      .describe('API base URL. Use the test URL for development with mock data.')
  })
);
