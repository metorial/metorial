import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .optional()
        .describe(
          'Custom API base URL for self-hosted or regional deployments. Defaults to https://api.draftable.com/v1'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
