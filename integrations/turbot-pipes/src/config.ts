import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://pipes.turbot.com/api/v0')
      .describe(
        'Base URL for the Turbot Pipes API. Change this for enterprise tenants with custom domains.'
      )
  })
);
