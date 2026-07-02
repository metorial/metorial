import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    senderId: z
      .string()
      .optional()
      .describe(
        'Default sender ID for SMS messages. If not set, must be provided per request.'
      )
  })
);
