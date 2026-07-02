import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domain: z
      .string()
      .describe(
        'Your Salesmate subdomain (e.g., if your dashboard URL is demo.salesmate.io, enter "demo")'
      )
  })
);
