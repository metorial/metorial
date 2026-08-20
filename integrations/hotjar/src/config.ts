import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Hotjar Organization ID. Found on the Sites & Organizations page. Required for user lookup and deletion operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
