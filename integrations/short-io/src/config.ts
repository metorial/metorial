import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    domainId: {
      schema: z
        .number()
        .optional()
        .describe(
          'Default domain ID to use for API operations. If not set, you must specify it per request.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    domain: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default domain hostname (e.g., "example.short.gy") to use when creating links.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
