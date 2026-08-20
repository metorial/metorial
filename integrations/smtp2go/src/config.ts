import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .enum([
          'https://api.smtp2go.com/v3',
          'https://us-api.smtp2go.com/v3',
          'https://eu-api.smtp2go.com/v3',
          'https://au-api.smtp2go.com/v3'
        ])
        .default('https://api.smtp2go.com/v3')
        .describe('API region endpoint'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
