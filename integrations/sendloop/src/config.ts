import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .optional()
      .describe(
        'Account subdomain for older connections; new connections resolve this from your API key'
      )
  })
);
