import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .string()
      .optional()
      .describe(
        'Legacy deployment environment, retained for compatibility. Humanloop retired on September 8, 2025; this setting cannot enable API operations.'
      )
  })
);
