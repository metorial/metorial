import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountId: {
      schema: z
        .string()
        .optional()
        .describe('Cloudflare Account ID. Found in the dashboard under Account Home.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    zoneId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Cloudflare Zone ID for the primary domain. Found in the dashboard under the domain overview page.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
