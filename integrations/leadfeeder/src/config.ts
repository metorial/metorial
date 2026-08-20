import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Leadfeeder account ID. If not provided, the first available account will be used.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
