import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organization: z
      .string()
      .describe(
        'Azure DevOps organization name (e.g. "myorg" from https://dev.azure.com/myorg)'
      ),
    project: z
      .string()
      .optional()
      .describe('Default project name. If not set, must be provided per-tool call.')
  })
);
