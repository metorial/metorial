import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    serverUrl: z
      .string()
      .url()
      .default('https://api.honeyhive.ai')
      .describe(
        'Base URL for the HoneyHive API. Use the default for managed cloud, or provide a custom URL for self-hosted deployments.'
      ),
    project: z
      .string()
      .optional()
      .describe(
        'Default project name to use across tools. Can be overridden per tool invocation.'
      )
  })
);
