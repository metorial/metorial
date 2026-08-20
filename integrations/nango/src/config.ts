import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.nango.dev')
        .describe(
          'Base URL for the Nango API. Use https://api.nango.dev for Nango Cloud or http://localhost:3003 for local development.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
