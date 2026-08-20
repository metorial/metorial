import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .string()
        .optional()
        .describe(
          'The environment to target for deployments (e.g. "default", "staging", "production"). If not set, the default environment is used.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
