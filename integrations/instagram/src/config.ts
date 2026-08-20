import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiVersion: {
      schema: z.string().default('v21.0').describe('Instagram Graph API version (e.g. v21.0)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    webhookVerifyToken: {
      schema: z
        .string()
        .optional()
        .describe(
          'Verify Token from the customer-owned Meta app Webhooks settings; secured bootstrap remains blocked until configured.'
        ),
      visibility: 'secret',
      lifecycle: 'reregister'
    },
    webhookAppSecret: {
      schema: z
        .string()
        .optional()
        .describe('App Secret used to authenticate Instagram webhook deliveries.'),
      visibility: 'secret',
      lifecycle: 'reregister'
    }
  }
});
