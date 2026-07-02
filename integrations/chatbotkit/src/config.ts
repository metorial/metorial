import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    runAsUserId: z
      .string()
      .optional()
      .describe(
        'Optional child user ID for Partner API impersonation (X-RunAs-User-ID header)'
      )
  })
);
