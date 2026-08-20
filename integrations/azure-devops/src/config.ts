import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organization: {
      schema: z
        .string()
        .describe(
          'Azure DevOps organization name (e.g. "myorg" from https://dev.azure.com/myorg)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    project: {
      schema: z
        .string()
        .optional()
        .describe('Default project name. If not set, must be provided per-tool call.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
