import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    siteUrl: {
      schema: z
        .string()
        .optional()
        .describe('Your site URL for rankings on openrouter.ai (sent as HTTP-Referer header)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    appTitle: {
      schema: z
        .string()
        .optional()
        .describe('Your app title shown on openrouter.ai (sent as X-OpenRouter-Title header)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
