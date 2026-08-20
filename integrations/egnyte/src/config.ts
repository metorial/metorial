import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    domain: {
      schema: z
        .string()
        .describe(
          'Your Egnyte domain (the subdomain part of {domain}.egnyte.com, e.g. "mycompany")'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
