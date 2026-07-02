import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe(
        'Your OneLogin account subdomain (e.g., "mycompany" for mycompany.onelogin.com)'
      )
  })
);
