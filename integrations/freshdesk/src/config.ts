import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe('Your Freshdesk subdomain (e.g., "mycompany" from mycompany.freshdesk.com)')
  })
);
