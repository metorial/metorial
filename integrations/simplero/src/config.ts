import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    userAgent: {
      schema: z
        .string()
        .describe('User-Agent header in format "Your App Name (email@example.com)"'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
