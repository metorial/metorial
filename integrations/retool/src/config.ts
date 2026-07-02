import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.retool.com')
      .describe(
        'Base URL for the Retool API. Use https://api.retool.com for cloud-hosted or https://retool.example.com for self-hosted instances.'
      )
  })
);
