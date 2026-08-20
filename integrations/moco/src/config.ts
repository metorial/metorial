import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    domain: {
      schema: z
        .string()
        .describe('Your MOCO account subdomain (e.g., "mycompany" for mycompany.mocoapp.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
