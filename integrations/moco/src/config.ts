import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domain: z
      .string()
      .describe('Your MOCO account subdomain (e.g., "mycompany" for mycompany.mocoapp.com)')
  })
);
