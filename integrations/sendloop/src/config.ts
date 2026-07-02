import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe(
        'Your Sendloop account subdomain (e.g., "yourcompany" from yourcompany.sendloop.com)'
      )
  })
);
