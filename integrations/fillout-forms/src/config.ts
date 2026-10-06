import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.fillout.com')
      .describe(
        'Base URL for the Fillout API. Use the public HTTPS origin shown in Developer settings; EU: https://eu-api.fillout.com, Canada: https://ca-api.fillout.com. An OAuth-resolved origin takes precedence.'
      )
  })
);
