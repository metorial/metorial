import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe('Your Gorgias account subdomain (e.g., "mystore" for mystore.gorgias.com)')
  })
);
