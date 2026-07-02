import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .optional()
      .describe(
        'Base URL for self-hosted Zep instances (e.g. https://your-zep-instance.com). Leave empty for Zep Cloud.'
      )
  })
);
