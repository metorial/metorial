import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    storeId: z
      .string()
      .optional()
      .describe(
        'Your Lemon Squeezy store ID. Required for creating webhooks, checkouts, and discounts.'
      )
  })
);
