import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    adminDomain: {
      schema: z
        .string()
        .describe(
          'The Ghost site domain (e.g., "mysite.ghost.io" or "blog.example.com"). Do not include the protocol (https://).'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
