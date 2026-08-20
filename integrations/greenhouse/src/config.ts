import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    onBehalfOf: {
      schema: z
        .string()
        .optional()
        .describe(
          'Greenhouse user ID used for the On-Behalf-Of header. Required for write operations (create, update, delete) for audit purposes.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
