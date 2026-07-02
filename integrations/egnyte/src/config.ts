import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domain: z
      .string()
      .describe(
        'Your Egnyte domain (the subdomain part of {domain}.egnyte.com, e.g. "mycompany")'
      )
  })
);
