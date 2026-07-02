import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe(
        'Your Workable account subdomain (e.g., "mycompany" from mycompany.workable.com)'
      )
  })
);
