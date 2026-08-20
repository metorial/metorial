import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    podId: {
      schema: z
        .string()
        .optional()
        .describe('Pod ID to scope all operations to a specific pod for multi-tenant setups'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
