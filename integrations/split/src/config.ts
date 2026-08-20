import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    workspaceId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default workspace (project) ID to use for API operations. If not set, must be provided per-tool.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    environmentId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default environment ID or name to use for flag definitions and segment operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
