import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.apiframe.pro')
        .describe('Base URL of the unofficial Midjourney API provider'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
