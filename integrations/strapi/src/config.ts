import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .describe('Base URL of the Strapi instance (e.g., https://your-strapi-instance.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
