import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    cdnBaseUrl: {
      schema: z
        .string()
        .default('https://ucarecdn.com')
        .describe('Base URL for the Uploadcare CDN. Defaults to https://ucarecdn.com'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
