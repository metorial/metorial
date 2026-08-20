import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe('Your Gorgias account subdomain (e.g., "mystore" for mystore.gorgias.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
