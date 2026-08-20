import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    teamId: {
      schema: z
        .string()
        .describe('Your DocsBot team ID. Found on the API page of your DocsBot dashboard.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    botId: {
      schema: z
        .string()
        .optional()
        .describe('Default bot ID. If set, triggers and tools will use this bot by default.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
