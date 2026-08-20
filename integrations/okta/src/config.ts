import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    domain: {
      schema: z
        .string()
        .describe('Your Okta organization domain, e.g. https://dev-123456.okta.com'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
