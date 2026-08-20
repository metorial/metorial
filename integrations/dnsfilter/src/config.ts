import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z
        .string()
        .optional()
        .describe(
          "Default organization ID to scope API requests to. If not set, requests use the token owner's organization."
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
