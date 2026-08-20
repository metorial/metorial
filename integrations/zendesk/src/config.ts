import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe(
          'The Zendesk account subdomain (e.g., "mycompany" from mycompany.zendesk.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
