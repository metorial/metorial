import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    customerId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Your PageXCRM customer/account identifier. If provided, it will be used as the default customer ID for lead submissions.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
