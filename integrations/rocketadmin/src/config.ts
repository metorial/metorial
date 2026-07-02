import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://app.rocketadmin.com')
      .describe(
        'Rocketadmin instance URL. Use the default for cloud-hosted or your self-hosted URL.'
      )
  })
);
