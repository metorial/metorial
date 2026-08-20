import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountName: {
      schema: z
        .string()
        .describe(
          'AppVeyor account name. Required when using a v2 (user-level) API key to specify which account to target.'
        )
        .optional(),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
