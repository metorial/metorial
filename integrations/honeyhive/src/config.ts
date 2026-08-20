import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    serverUrl: {
      schema: z
        .string()
        .url()
        .default('https://api.honeyhive.ai')
        .describe(
          'Base URL for the HoneyHive API. Use the default for managed cloud, or provide a custom URL for self-hosted deployments.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    project: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default project name to use across tools. Can be overridden per tool invocation.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
