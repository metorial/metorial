import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    partition: z
      .string()
      .optional()
      .describe(
        'Default partition to scope operations to. Useful for multi-tenant applications.'
      )
  })
);
