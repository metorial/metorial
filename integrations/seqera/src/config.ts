import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.cloud.seqera.io')
        .describe(
          'Seqera Platform API base URL. Use the default for Seqera Cloud, or provide a custom URL for self-hosted Enterprise deployments.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    workspaceId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default workspace ID to use for API requests. Find this on the Workspaces tab of your organization page.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
