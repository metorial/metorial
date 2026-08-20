import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    stripeAccountId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Connected Stripe account ID to act on behalf of (for Stripe Connect platforms). When set, all API calls include the Stripe-Account header.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
