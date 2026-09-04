import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        'Google Cloud quota project ID used for OAuth requests. Not needed for API-key authentication.'
      )
  })
);
