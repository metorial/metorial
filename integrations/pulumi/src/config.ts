import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.pulumi.com')
      .describe(
        'Pulumi Cloud API base URL. Use default for managed service, or specify custom URL for self-hosted instances.'
      ),
    organization: z
      .string()
      .optional()
      .describe(
        'Default Pulumi organization name. If set, used as default for all operations.'
      )
  })
);
