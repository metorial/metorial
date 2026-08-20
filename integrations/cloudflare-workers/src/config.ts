import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountId: {
      schema: z
        .string()
        .describe(
          'Cloudflare Account ID. Found in the Cloudflare dashboard under Account Home.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
