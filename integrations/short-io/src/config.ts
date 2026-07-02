import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domainId: z
      .number()
      .optional()
      .describe(
        'Default domain ID to use for API operations. If not set, you must specify it per request.'
      ),
    domain: z
      .string()
      .optional()
      .describe(
        'Default domain hostname (e.g., "example.short.gy") to use when creating links.'
      )
  })
);
