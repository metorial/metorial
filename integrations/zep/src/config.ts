import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .optional()
        .describe(
          'Base URL for self-hosted Zep instances (e.g. https://your-zep-instance.com). Leave empty for Zep Cloud.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
