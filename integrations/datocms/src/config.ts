import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .string()
        .optional()
        .describe(
          'Target sandbox environment name. Leave empty to use the primary environment.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
