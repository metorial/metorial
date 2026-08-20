import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe(
          'Your Sendloop account subdomain (e.g., "yourcompany" from yourcompany.sendloop.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
