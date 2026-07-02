import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe(
        'Your SimpleKPI account subdomain (e.g., "mycompany" from https://mycompany.simplekpi.com)'
      )
  })
);
