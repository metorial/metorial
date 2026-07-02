import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .string()
      .optional()
      .describe(
        'The environment to target for deployments (e.g. "default", "staging", "production"). If not set, the default environment is used.'
      )
  })
);
