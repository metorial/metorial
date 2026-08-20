import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe(
          'Your Freshservice subdomain (the part before .freshservice.com in your portal URL, e.g. "mycompany")'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
