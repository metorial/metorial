import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z
        .string()
        .optional()
        .describe(
          'The Eventbrite organization ID to scope API requests to. Required for most operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
