import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domain: z
      .string()
      .describe('Your CloudCart store subdomain (the part before .cloudcart.net)')
  })
);
