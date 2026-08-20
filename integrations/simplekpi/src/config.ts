import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe(
          'Your SimpleKPI account subdomain (e.g., "mycompany" from https://mycompany.simplekpi.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
