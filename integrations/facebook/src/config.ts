import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiVersion: {
      schema: z.string().default('v25.0').describe('Facebook Graph API version (e.g. v25.0)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    webhookVerifyToken: {
      schema: z
        .string()
        .optional()
        .describe(
          'Verify Token from the customer-owned Facebook app Webhooks settings; secured bootstrap remains blocked until configured.'
        ),
      visibility: 'secret',
      lifecycle: 'reregister'
    },
    webhookAppSecret: {
      schema: z
        .string()
        .optional()
        .describe('App Secret used to authenticate Facebook webhook deliveries.'),
      visibility: 'secret',
      lifecycle: 'reregister'
    }
  }
});
