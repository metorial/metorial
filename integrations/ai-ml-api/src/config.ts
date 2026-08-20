import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.aimlapi.com')
        .describe('Base URL for the AI/ML API'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
