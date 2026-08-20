import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Client account ID for agency partners managing multiple accounts. Leave empty if not using agency features.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
