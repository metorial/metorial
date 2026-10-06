import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    customerId: z
      .string()
      .optional()
      .describe(
        'Legacy default customer ID. Prefer list_customers and pass customerId to each operation.'
      )
  })
);
