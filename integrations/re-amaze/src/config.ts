import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    brandSubdomain: {
      schema: z
        .string()
        .describe(
          'The brand subdomain for your Re:amaze account (e.g., "mybrand" from mybrand.reamaze.io)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
