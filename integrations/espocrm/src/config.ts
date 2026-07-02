import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    siteUrl: z
      .string()
      .describe(
        'The URL of your EspoCRM instance (e.g., https://crm.yourcompany.com). This is the same URL you use to access EspoCRM in your browser.'
      )
  })
);
