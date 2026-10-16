import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    customerId: z
      .string()
      .optional()
      .describe(
        'Optional default external customer identifier for submitted leads. Each lead can override this value.'
      )
  })
);
