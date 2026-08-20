import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .describe('Base URL of your Flowise instance (e.g. https://your-flowise.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
