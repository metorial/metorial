import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    runAsUserId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Optional child user ID for Partner API impersonation (X-RunAs-User-ID header)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
