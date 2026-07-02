import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    podId: z
      .string()
      .optional()
      .describe('Pod ID to scope all operations to a specific pod for multi-tenant setups')
  })
);
