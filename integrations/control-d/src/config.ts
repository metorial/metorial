import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    orgId: z
      .string()
      .optional()
      .describe(
        'Sub-organization ID to impersonate. When set, all API calls will operate within the specified sub-organization context.'
      )
  })
);
