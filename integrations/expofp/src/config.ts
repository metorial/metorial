import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    eventId: z
      .number()
      .optional()
      .describe(
        'Default event ID used by triggers to monitor for changes. Find your event ID using the List Events tool.'
      )
  })
);
