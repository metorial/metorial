import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe('Your Aha! account subdomain (e.g. "company" for company.aha.io)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
