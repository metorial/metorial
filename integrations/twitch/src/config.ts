import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    broadcasterId: {
      schema: z
        .string()
        .optional()
        .describe('Default broadcaster user ID to use for channel-specific operations'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
