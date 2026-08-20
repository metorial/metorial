import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    hostname: {
      schema: z
        .string()
        .describe('The website hostname to retrieve analytics for (e.g. "example.com")'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
