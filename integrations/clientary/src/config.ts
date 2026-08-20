import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe(
          'Your Clientary subdomain. If your URL is https://mycompany.clientary.com, the subdomain is "mycompany".'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
