import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Your Beaconstac Organization ID. Required for organization-specific API requests, analytics, and multi-user access management.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
