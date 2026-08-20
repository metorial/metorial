import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    orgId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Sub-organization ID to impersonate. When set, all API calls will operate within the specified sub-organization context.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
