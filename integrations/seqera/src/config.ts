import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.cloud.seqera.io')
      .describe(
        'Seqera Platform API base URL. Use the default for Seqera Cloud, or provide a custom URL for self-hosted Enterprise deployments.'
      ),
    workspaceId: z
      .string()
      .optional()
      .describe(
        'Default workspace ID to use for API requests. Find this on the Workspaces tab of your organization page.'
      )
  })
);
