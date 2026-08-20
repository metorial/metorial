import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    eventId: {
      schema: z
        .number()
        .optional()
        .describe(
          'Default event ID used by triggers to monitor for changes. Find your event ID using the List Events tool.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
