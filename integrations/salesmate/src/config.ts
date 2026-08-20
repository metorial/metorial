import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    domain: {
      schema: z
        .string()
        .describe(
          'Your Salesmate subdomain (e.g., if your dashboard URL is demo.salesmate.io, enter "demo")'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
