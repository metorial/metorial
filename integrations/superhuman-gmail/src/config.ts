import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    userId: {
      schema: z
        .string()
        .default('me')
        .describe(
          'Gmail user ID. Use "me" for the authenticated user, or a mailbox email for delegated access.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
