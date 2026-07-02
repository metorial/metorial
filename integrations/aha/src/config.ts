import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe('Your Aha! account subdomain (e.g. "company" for company.aha.io)')
  })
);
