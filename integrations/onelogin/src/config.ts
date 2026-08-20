import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe(
          'Your OneLogin account subdomain (e.g., "mycompany" for mycompany.onelogin.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
