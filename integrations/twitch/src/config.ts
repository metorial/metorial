import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    broadcasterId: z
      .string()
      .optional()
      .describe('Default broadcaster user ID to use for channel-specific operations')
  })
);
