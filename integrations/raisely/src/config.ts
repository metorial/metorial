import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    campaignUuid: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default campaign UUID to use for API requests. If not set, must be provided per-request.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
