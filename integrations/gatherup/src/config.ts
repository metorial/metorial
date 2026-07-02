import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    agent: z
      .string()
      .optional()
      .describe(
        'Agent (client) ID for agency accounts. When using Global API credentials, specify which client to target.'
      )
  })
);
