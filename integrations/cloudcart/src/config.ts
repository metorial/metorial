import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    domain: {
      schema: z
        .string()
        .describe('Your CloudCart store subdomain (the part before .cloudcart.net)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
