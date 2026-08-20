import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    chain: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default blockchain to use (e.g. ethereum, polygon, base, arbitrum). If not set, defaults to ethereum.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
