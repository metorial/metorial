import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    stripeAccountId: z
      .string()
      .optional()
      .describe(
        'Connected Stripe account ID to act on behalf of (for Stripe Connect platforms). When set, all API calls include the Stripe-Account header.'
      )
  })
);
