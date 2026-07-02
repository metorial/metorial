import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    siteUrl: z
      .string()
      .optional()
      .describe('Your site URL for rankings on openrouter.ai (sent as HTTP-Referer header)'),
    appTitle: z
      .string()
      .optional()
      .describe('Your app title shown on openrouter.ai (sent as X-OpenRouter-Title header)')
  })
);
