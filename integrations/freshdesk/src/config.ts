import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe('Your Freshdesk subdomain (e.g., "mycompany" from mycompany.freshdesk.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
