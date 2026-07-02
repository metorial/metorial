import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    teamId: z
      .string()
      .describe('Your DocsBot team ID. Found on the API page of your DocsBot dashboard.'),
    botId: z
      .string()
      .optional()
      .describe('Default bot ID. If set, triggers and tools will use this bot by default.')
  })
);
