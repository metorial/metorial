import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe(
        'Your Freshservice subdomain (the part before .freshservice.com in your portal URL, e.g. "mycompany")'
      )
  })
);
