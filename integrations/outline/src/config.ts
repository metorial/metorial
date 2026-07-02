import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://app.getoutline.com')
      .describe(
        'Base URL of the Outline instance. Use https://app.getoutline.com for cloud or your self-hosted domain.'
      )
  })
);
