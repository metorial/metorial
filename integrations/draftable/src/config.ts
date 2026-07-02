import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .optional()
      .describe(
        'Custom API base URL for self-hosted or regional deployments. Defaults to https://api.draftable.com/v1'
      )
  })
);
