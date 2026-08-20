import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    senderId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default sender ID for SMS messages. If not set, must be provided per request.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
