import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    storeId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Your Lemon Squeezy store ID. Required for creating webhooks, checkouts, and discounts.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
