import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceUrl: z
      .string()
      .describe(
        'The base URL of the Appsmith instance (e.g. https://app.appsmith.com or https://your-self-hosted-domain.com). Do not include a trailing slash.'
      )
  })
);
