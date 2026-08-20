import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe(
          'Your Workable account subdomain (e.g., "mycompany" from mycompany.workable.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
