import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.ninox.com')
      .describe(
        'Base URL for the Ninox API. Use https://api.ninox.com for Public Cloud, or https://{your-instance}.ninoxdb.de for Private Cloud / On-Premises.'
      )
  })
);
