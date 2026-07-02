import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .optional()
      .describe(
        'Default organization ID to use for API requests. If not set, must be provided per tool invocation.'
      )
  })
);
