import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.retool.com')
        .describe(
          'Base URL for the Retool API. Use https://api.retool.com for cloud-hosted or https://retool.example.com for self-hosted instances.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
