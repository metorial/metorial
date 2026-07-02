import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .optional()
      .describe('Cloudflare Account ID. Found in the dashboard under Account Home.'),
    zoneId: z
      .string()
      .optional()
      .describe(
        'Cloudflare Zone ID for the primary domain. Found in the dashboard under the domain overview page.'
      )
  })
);
