import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    propertyId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default property ID to use for API requests. If not set, operations may require a property ID as input.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
