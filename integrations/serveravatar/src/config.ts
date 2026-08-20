import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default organization ID to use for API requests. If not set, must be provided per tool invocation.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
