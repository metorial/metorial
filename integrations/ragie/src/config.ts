import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    partition: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default partition to scope operations to. Useful for multi-tenant applications.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
