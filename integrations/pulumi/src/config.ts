import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.pulumi.com')
        .describe(
          'Pulumi Cloud API base URL. Use default for managed service, or specify custom URL for self-hosted instances.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    organization: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default Pulumi organization name. If set, used as default for all operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
