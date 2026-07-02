import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    customerId: z
      .string()
      .optional()
      .describe(
        'Your PageXCRM customer/account identifier. If provided, it will be used as the default customer ID for lead submissions.'
      )
  })
);
