import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe(
        'Your Clientary subdomain. If your URL is https://mycompany.clientary.com, the subdomain is "mycompany".'
      )
  })
);
