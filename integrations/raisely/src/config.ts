import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    campaignUuid: z
      .string()
      .optional()
      .describe(
        'Default campaign UUID to use for API requests. If not set, must be provided per-request.'
      )
  })
);
