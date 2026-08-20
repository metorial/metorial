import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectKey: {
      schema: z
        .string()
        .optional()
        .describe('Default LaunchDarkly project key to use when not specified per-request'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    environmentKey: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default LaunchDarkly environment key to use when not specified per-request'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
