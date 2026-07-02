import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectKey: z
      .string()
      .optional()
      .describe('Default LaunchDarkly project key to use when not specified per-request'),
    environmentKey: z
      .string()
      .optional()
      .describe('Default LaunchDarkly environment key to use when not specified per-request')
  })
);
