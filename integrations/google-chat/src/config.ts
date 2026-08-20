import { configV2 } from 'slates';
import { z } from 'zod';

export let googleChatConfigSchema = z.object({
  defaultSpace: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Default Google Chat space ID or resource name (spaces/{space})')
});

export type GoogleChatConfig = z.infer<typeof googleChatConfigSchema>;

export let config = configV2({
  fields: {
    defaultSpace: {
      schema: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Default Google Chat space ID or resource name (spaces/{space})'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
