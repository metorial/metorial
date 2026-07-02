import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .string()
      .optional()
      .describe('Target sandbox environment name. Leave empty to use the primary environment.')
  })
);
