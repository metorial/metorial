import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://app.formbricks.com')
      .describe(
        'Base URL of the Formbricks instance. Use the default for cloud-hosted, or provide your self-hosted domain.'
      )
  })
);
