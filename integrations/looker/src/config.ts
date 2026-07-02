import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceUrl: z
      .string()
      .describe(
        'The base URL of your Looker instance (e.g., https://mycompany.looker.com or https://mycompany.cloud.looker.com)'
      )
  })
);
